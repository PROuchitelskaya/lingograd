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
from contextlib import asynccontextmanager
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

# На школьном ноутбуке сервер слушает всю сеть, чтобы телефоны видели его по Wi-Fi.
# На хостинге он прячется за nginx, а адрес для QR-кода задаётся явно —
# иначе в код попал бы внутренний IP машины, недоступный ученикам.
import os

HOST = os.environ.get("LINGOGRAD_HOST", "0.0.0.0")
PORT = int(os.environ.get("LINGOGRAD_PORT", "4190"))
PUBLIC_URL = os.environ.get("LINGOGRAD_PUBLIC_URL", "").rstrip("/")

@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Фоновая уборка. Раньше комнаты чистились только в момент, когда кто-то
    создавал новую игру: после последнего урока мусор висел в памяти до утра."""
    async def janitor():
        while True:
            await asyncio.sleep(SWEEP_EVERY_S)
            try:
                hub.sweep()
            except Exception as exc:
                print(f"[sweep] {type(exc).__name__}: {exc}")

    task = asyncio.create_task(janitor())
    yield
    task.cancel()


app = FastAPI(title="Лингоград", docs_url=None, redoc_url=None, lifespan=lifespan)


# --------------------------------------------------------------------------
# Хаб соединений
# --------------------------------------------------------------------------

class Connection:
    __slots__ = ("ws", "role", "player_id", "alive", "last_seen")

    def __init__(self, ws: WebSocket, role: str, player_id: str | None):
        self.ws = ws
        self.role = role
        self.player_id = player_id
        self.alive = True
        # телефон, потерявший вайфай, не закрывает соединение — сервер считал бы
        # его живым бесконечно и держал комнату в памяти. Клиент пингует раз
        # в 15 секунд, поэтому молчание дольше минуты означает, что его нет.
        self.last_seen = time.time()


# Комната живёт в памяти процесса, и раньше она висела там шесть часов после
# создания — даже когда урок давно кончился и все закрыли вкладки. За учебный
# день таких комнат набирались сотни, и память процесса росла до сотен мегабайт.
# Теперь отсчёт идёт не от создания, а от момента, когда комната опустела:
# длинный урок ничего не оборвёт, а пустая комната освободит память быстро.
EMPTY_DONE_MS = 10 * 60_000     # игра доиграна, все ушли
EMPTY_IDLE_MS = 30 * 60_000     # все ушли, но игра не закончена (перемена, потеря связи)
HARD_LIMIT_MS = 6 * 3600_000    # предел на всякий случай: комната не живёт дольше
SWEEP_EVERY_S = 120             # как часто прибираться
SILENT_AFTER_S = 75             # соединение молчит дольше — считаем оборванным


class Hub:
    def __init__(self):
        self.sessions: dict[str, GameSession] = {}
        self.conns: dict[str, list[Connection]] = {}
        self.empty_since: dict[str, int] = {}   # когда комната осталась без людей

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

    def close(self, code: str) -> None:
        s = self.sessions.pop(code, None)
        if s and s._task:
            s._task.cancel()
        self.conns.pop(code, None)
        self.empty_since.pop(code, None)

    def sweep(self) -> int:
        """Выбрасывает молчащие соединения и убирает опустевшие комнаты."""
        now = int(time.time() * 1000)
        silent = time.time() - SILENT_AFTER_S
        for code, conns in list(self.conns.items()):
            for c in list(conns):
                if c.last_seen < silent:
                    self.drop(code, c)
        closed = 0
        for code, s in list(self.sessions.items()):
            if self.conns.get(code):
                self.empty_since.pop(code, None)      # люди на месте
                if now - s.created_at < HARD_LIMIT_MS:
                    continue
            else:
                since = self.empty_since.setdefault(code, now)
                done = s.phase in ("results", "awards")
                if now - since < (EMPTY_DONE_MS if done else EMPTY_IDLE_MS)                         and now - s.created_at < HARD_LIMIT_MS:
                    continue
            self.close(code)
            closed += 1
        return closed

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


def base_url() -> str:
    """Адрес, по которому ученики откроют игру: домен на хостинге или IP в классе."""
    return PUBLIC_URL or f"http://{lan_ip()}:{PORT}"


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
        "join_url": f"{base_url()}/?c={s.code}",
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
            conn.last_seen = time.time()
            t = msg.get("t")

            if t == "ping":
                await hub.send(ws, {"t": "pong", "now": int(time.time() * 1000)})

            elif t == "pick_team" and player:
                if session.pick_team(player, msg.get("team_id", "")):
                    await hub.push_state(code)

            elif t == "answer" and player:
                qid = msg.get("qid", "")
                res = await session.submit(player, qid, msg.get("payload"))
                # qid обязателен: ответ мог прийти уже после смены задания,
                # и без него вердикт прилипал бы к следующей карточке
                await hub.send(ws, {"t": "answer_result", "qid": qid} | res)

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
        # доигранную комнату, из которой вышел последний человек, держать незачем:
        # результаты уже показаны, вернуться в неё никто не может
        if code and not hub.conns.get(code):
            done = session and session.phase in ("results", "awards")
            hub.empty_since[code] = int(time.time() * 1000) - (EMPTY_DONE_MS if done else 0)
            if done:
                hub.close(code)


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
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning", access_log=False)
