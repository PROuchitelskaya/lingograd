"""ЛИНГОГРАД — сервер: статика + REST + WebSocket.

Запуск:  python backend/main.py   (или run.ps1)
Ученики заходят на http://<ip-учителя>:4190/ , учитель — на /teacher
"""

from __future__ import annotations

import asyncio
import json
import socket
import sys
import time
from pathlib import Path

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from content import GRADES, bank_stats
from game import GameSession, make_code

FRONTEND = BASE.parent / "frontend"
PORT = 4190

app = FastAPI(title="Лингоград", docs_url=None, redoc_url=None)


# --------------------------------------------------------------------------
# Хаб соединений
# --------------------------------------------------------------------------

class Connection:
    __slots__ = ("ws", "role", "player_id", "alive")

    def __init__(self, ws: WebSocket, role: str, player_id: str | None):
        self.ws = ws
        self.role = role
        self.player_id = player_id
        self.alive = True


class Hub:
    def __init__(self):
        self.sessions: dict[str, GameSession] = {}
        self.conns: dict[str, list[Connection]] = {}

    # --- сессии ---------------------------------------------------------

    def create(self, grade: int, teams: int, duration: int, mode: str) -> GameSession:
        self.sweep()
        code = make_code()
        while code in self.sessions:
            code = make_code()
        s = GameSession(code, grade, teams, duration, mode, self)
        self.sessions[code] = s
        self.conns[code] = []
        return s

    def get(self, code: str) -> GameSession | None:
        return self.sessions.get((code or "").strip().upper())

    def sweep(self) -> None:
        """Убирает комнаты старше 6 часов."""
        cutoff = int(time.time() * 1000) - 6 * 3600_000
        for code, s in list(self.sessions.items()):
            if s.created_at < cutoff:
                if s._task:
                    s._task.cancel()
                self.sessions.pop(code, None)
                self.conns.pop(code, None)

    # --- рассылка -------------------------------------------------------

    async def broadcast(self, code: str, msg: dict) -> None:
        payload = json.dumps(msg, ensure_ascii=False)
        dead = []
        for c in list(self.conns.get(code, [])):
            try:
                await c.ws.send_text(payload)
            except Exception:
                dead.append(c)
        for c in dead:
            self.drop(code, c)

    async def push_state(self, code: str) -> None:
        """Каждому — своя проекция состояния."""
        s = self.get(code)
        if not s:
            return
        for c in list(self.conns.get(code, [])):
            try:
                if c.role == "teacher":
                    data = s.snapshot(teacher=True)
                else:
                    data = s.snapshot(player=s.players.get(c.player_id))
                await c.ws.send_text(json.dumps(data, ensure_ascii=False))
            except Exception:
                self.drop(code, c)

    async def send(self, ws: WebSocket, msg: dict) -> None:
        try:
            await ws.send_text(json.dumps(msg, ensure_ascii=False))
        except Exception:
            pass

    def drop(self, code: str, conn: Connection) -> None:
        lst = self.conns.get(code)
        if lst and conn in lst:
            lst.remove(conn)


hub = Hub()


def lan_ip() -> str:
    """IP в локальной сети — для QR-кода на экране учителя."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"


# --------------------------------------------------------------------------
# REST
# --------------------------------------------------------------------------

@app.post("/api/session")
async def create_session(body: dict):
    grade = int(body.get("grade", 5))
    teams = int(body.get("teams", 4))
    duration = int(body.get("duration", 45))
    mode = body.get("mode", "september")
    if grade not in GRADES:
        raise HTTPException(400, "Класс должен быть от 5 до 11")
    teams = max(2, min(6, teams))
    duration = max(10, min(120, duration))
    s = hub.create(grade, teams, duration, mode)
    return {
        "code": s.code,
        "teacher_token": s.teacher_token,
        "grade": grade,
        "teams": teams,
        "duration": duration,
        "mode": mode,
        "total_questions": s.total_questions,
        "join_url": f"http://{lan_ip()}:{PORT}/?c={s.code}",
        "lan_ip": lan_ip(),
        "port": PORT,
    }


@app.get("/api/session/{code}")
async def peek_session(code: str):
    s = hub.get(code)
    if not s:
        return JSONResponse({"exists": False}, status_code=404)
    return {
        "exists": True, "code": s.code, "grade": s.grade, "phase": s.phase,
        "online": s.online_count(), "mode": s.mode,
        "teams": s.teams_public(), "started": s.phase != "lobby",
    }


@app.get("/api/bank")
async def bank():
    return {"grades": GRADES, "stats": bank_stats()}


@app.get("/api/analytics/{code}")
async def analytics(code: str, token: str = ""):
    s = hub.get(code)
    if not s:
        raise HTTPException(404, "Сессия не найдена")
    if token != s.teacher_token:
        raise HTTPException(403, "Нужен код учителя")
    return s.analytics()


# --------------------------------------------------------------------------
# WebSocket
# --------------------------------------------------------------------------

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    code = ""
    conn: Connection | None = None
    session: GameSession | None = None
    player = None

    try:
        raw = await asyncio.wait_for(ws.receive_text(), timeout=20)
        hello = json.loads(raw)
        if hello.get("t") != "hello":
            await hub.send(ws, {"t": "error", "message": "Ожидался hello"})
            return await ws.close()

        code = (hello.get("code") or "").strip().upper()
        session = hub.get(code)
        if not session:
            await hub.send(ws, {"t": "error", "code": "no_session",
                                "message": "Игра с таким кодом не найдена"})
            return await ws.close()

        role = "teacher" if hello.get("role") == "teacher" else "student"
        if role == "teacher":
            if hello.get("token") != session.teacher_token:
                await hub.send(ws, {"t": "error", "code": "bad_token",
                                    "message": "Неверный код учителя"})
                return await ws.close()
            conn = Connection(ws, "teacher", None)
        else:
            # имя из hello сознательно игнорируется: игрок получает прозвище
            player = session.add_player(hello.get("player_id"))
            conn = Connection(ws, "student", player.id)
            await hub.send(ws, {"t": "welcome", "player_id": player.id,
                                "name": player.name, "code": session.code})

        hub.conns.setdefault(code, []).append(conn)
        await hub.send(ws, session.snapshot(player=player, teacher=(role == "teacher")))
        if role == "student":
            await hub.push_state(code)

        while True:
            msg = json.loads(await ws.receive_text())
            t = msg.get("t")

            if t == "ping":
                await hub.send(ws, {"t": "pong", "now": int(time.time() * 1000)})

            elif t == "pick_team" and player:
                if session.pick_team(player, msg.get("team_id", "")):
                    await hub.push_state(code)

            elif t == "answer" and player:
                res = await session.submit(player, msg.get("qid", ""), msg.get("payload"))
                await hub.send(ws, {"t": "answer_result"} | res)

            elif t == "teacher" and conn.role == "teacher":
                await session.teacher_action(msg.get("action", ""), msg.get("value"))

            elif t == "sync":
                await hub.send(ws, session.snapshot(player=player,
                                                    teacher=(conn.role == "teacher")))

    except (WebSocketDisconnect, asyncio.TimeoutError):
        pass
    except Exception as exc:  # не роняем комнату из-за одного клиента
        print(f"[ws] {type(exc).__name__}: {exc}")
    finally:
        if conn and code:
            hub.drop(code, conn)
        if session and player:
            still_open = any(c.player_id == player.id for c in hub.conns.get(code, []))
            if not still_open:
                player.connected = False
                await hub.push_state(code)


# --------------------------------------------------------------------------
# Статика и страницы
# --------------------------------------------------------------------------

class FreshStatic(StaticFiles):
    """Отдаёт файлы без кеширования.

    Иначе после правки игры половина класса продолжит работать на старой
    версии модулей, пока не почистит кеш телефона. Файлы маленькие.
    """

    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "no-cache, must-revalidate"
        return response


app.mount("/js", FreshStatic(directory=FRONTEND / "js"), name="js")
app.mount("/styles", FreshStatic(directory=FRONTEND / "styles"), name="styles")


@app.get("/")
@app.get("/teacher")
@app.get("/play")
async def index():
    return FileResponse(FRONTEND / "index.html",
                        headers={"Cache-Control": "no-cache, must-revalidate"})


@app.get("/favicon.svg")
async def favicon():
    return FileResponse(FRONTEND / "favicon.svg")


if __name__ == "__main__":
    ip = lan_ip()
    print("\n  ЛИНГОГРАД: ЯЗЫК НА ГРАНИ — спецвыпуск «1 сентября»")
    print(f"  Ученики : http://{ip}:{PORT}/")
    print(f"  Учитель : http://{ip}:{PORT}/teacher")
    print(f"  Локально: http://127.0.0.1:{PORT}/\n")
    # access-логи выключены намеренно: в них попадали бы IP-адреса устройств,
    # а игра не должна накапливать ничего, что связывает ответы с человеком
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="warning", access_log=False)
