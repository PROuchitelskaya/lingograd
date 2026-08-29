"""ЛИНГОГРАД — игровая сессия.

Модель синхронная (как в классе): все ученики видят один и тот же вопрос и
один и тот же таймер (ТЗ §41). Ход игры двигает серверный тикер, поэтому
переходы и финальная анимация не требуют участия учителя (ТЗ §51), но
учитель может поставить паузу, пропустить задание или добавить время (ТЗ §43).
"""

from __future__ import annotations

import asyncio
import random
import secrets
import string
import time
from dataclasses import dataclass, field

from content import DISTRICT_BY_ID, build_missions, check, make_view, reveal_payload

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # без похожих 0/O, 1/I

TEAM_PRESET = [
    {"id": "blue", "name": "СИНИЕ", "emoji": "🔵", "color": "#3155D9", "motto": "Точность и логика"},
    {"id": "gold", "name": "ЗОЛОТЫЕ", "emoji": "🟡", "color": "#FFC94A", "motto": "Блеск знаний"},
    {"id": "leaf", "name": "ЛИСТЬЯ", "emoji": "🟠", "color": "#F28C38", "motto": "Осенний ветер"},
    {"id": "ink", "name": "ЧЕРНИЛА", "emoji": "🟣", "color": "#7357C8", "motto": "Сила письма"},
    {"id": "wise", "name": "ЗНАТОКИ", "emoji": "🟢", "color": "#55B77A", "motto": "Правило знаем"},
    {"id": "bell", "name": "ЗВОНКИ", "emoji": "🔴", "color": "#E85B5B", "motto": "Первый звонок"},
]

# Длительность служебных фаз, сек (ТЗ §14–15, §27–29)
# запас на сетевую задержку при закрытии вопроса
GRACE_MS = 500

PHASE_TIME = {
    "september": 14,
    "story": 20,
    "map": 9,
    "mission_intro": 8,
    "reveal": 8,
    "mission_complete": 10,
    "victory": 14,
    "results": 26,
}

MAX_ATTEMPTS = 2  # вторая попытка — половина баллов (ТЗ §20: ошибка ≠ наказание)


def now_ms() -> int:
    return int(time.time() * 1000)


def make_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(4))


@dataclass
class Player:
    id: str
    name: str
    team_id: str | None = None
    connected: bool = True
    joined_at: int = field(default_factory=now_ms)
    correct: int = 0
    answered: int = 0
    score: int = 0
    total_ms: int = 0          # суммарное время верных ответов
    streak: int = 0
    best_streak: int = 0

    def public(self) -> dict:
        return {
            "id": self.id, "name": self.name, "team_id": self.team_id,
            "connected": self.connected, "score": self.score,
            "correct": self.correct, "answered": self.answered,
            "best_streak": self.best_streak,
        }


@dataclass
class Team:
    id: str
    name: str
    emoji: str
    color: str
    motto: str
    score: int = 0
    correct: int = 0
    answered: int = 0
    total_ms: int = 0
    topic_correct: dict = field(default_factory=dict)   # district -> верных
    topic_answered: dict = field(default_factory=dict)  # district -> ответов

    @property
    def accuracy(self) -> float:
        return self.correct / self.answered if self.answered else 0.0

    @property
    def avg_ms(self) -> float:
        return self.total_ms / self.correct if self.correct else 999_000.0

    def district_accuracy(self, district: str) -> float:
        a = self.topic_answered.get(district, 0)
        return self.topic_correct.get(district, 0) / a if a else 0.0

    def public(self, members: int = 0) -> dict:
        return {
            "id": self.id, "name": self.name, "emoji": self.emoji, "color": self.color,
            "motto": self.motto, "score": self.score, "members": members,
            "accuracy": round(self.accuracy, 3),
            "correct": self.correct, "answered": self.answered,
        }


class GameSession:
    """Одна игровая комната."""

    def __init__(self, code: str, grade: int, teams_count: int, duration_min: int,
                 mode: str, hub):
        self.code = code
        self.grade = grade
        self.duration_min = duration_min
        self.mode = mode  # "september" | "normal"
        self.hub = hub
        self.teacher_token = secrets.token_urlsafe(12)
        self.created_at = now_ms()
        self.rng = random.Random(f"{code}-{grade}")

        self.teams: dict[str, Team] = {
            t["id"]: Team(**t) for t in TEAM_PRESET[:teams_count]
        }
        self.players: dict[str, Player] = {}

        self.missions = build_missions(grade, self.rng)
        self.total_questions = sum(len(m["questions"]) for m in self.missions)

        self.phase = "lobby"
        self.mission_index = 0
        self.question_index = 0
        self.global_index = 0
        self.deadline = 0
        self.phase_started = 0
        self.paused = False
        self.pause_started = 0
        self.started_at = 0
        self.session_deadline = 0
        self.time_over = False
        self.finished = False

        self.current_q: dict | None = None
        self.question_window_ms = 0    # фактическая длительность вопроса с учётом «+15 с»
        self.current_view: dict | None = None
        self.current_order: dict | None = None
        self.answers: dict[str, dict] = {}     # player_id -> {attempts, done, correct}
        self.answers_history: dict[str, dict] = {}  # qid -> ответы (для «назад»)
        self.views: dict[str, dict] = {}       # qid -> вид задания: порядок вариантов
        self.scored_tower: set[str] = set()    # задания финала, уже отнявшие energy
        self.last_reveal: dict | None = None
        self.mission_report: dict | None = None

        self.chaos_hp = 100.0
        self.awards: list[dict] = []
        self.ranking: list[dict] = []
        self.log: list[dict] = []              # аналитика по заданиям

        self._task: asyncio.Task | None = None

    # ---------------------------------------------------------------- игроки

    def team_members(self, team_id: str) -> list[Player]:
        return [p for p in self.players.values() if p.team_id == team_id]

    def add_player(self, player_id: str | None = None) -> Player:
        """Заводит игрока под игровым прозвищем.

        Имена и фамилии не запрашиваются и не хранятся: на сервере остаются
        только прозвище, команда и счёт, по которым конкретного ребёнка
        определить нельзя. Так игру можно раздать любому числу школ,
        не собирая согласий на обработку персональных данных.
        """
        if player_id and player_id in self.players:
            p = self.players[player_id]
            p.connected = True
            return p
        pid = player_id or secrets.token_urlsafe(9)
        p = Player(id=pid, name=f"Хранитель {len(self.players) + 1}")
        self.players[pid] = p
        if self.phase != "lobby":
            # опоздавший подключился после старта: без команды он не смог бы
            # ответить ни разу за урок, поэтому сажаем его в самую маленькую
            p.team_id = min(self.teams, key=lambda t: len(self.team_members(t)))
        return p

    def pick_team(self, player: Player, team_id: str) -> bool:
        if team_id == "" and self.phase == "lobby":
            player.team_id = None      # «сменить команду» до начала игры
            return True
        if team_id not in self.teams:
            return False
        if self.phase != "lobby" and player.team_id:
            return False  # команду не меняют посреди игры (ТЗ §41)
        player.team_id = team_id
        return True

    def autobalance(self) -> None:
        """Раскидывает тех, кто не выбрал команду, в самые маленькие."""
        for p in self.players.values():
            if p.team_id:
                continue
            smallest = min(self.teams, key=lambda t: len(self.team_members(t)))
            p.team_id = smallest

    # ---------------------------------------------------------------- фазы

    @property
    def mission(self) -> dict:
        return self.missions[self.mission_index]

    def phase_left_ms(self) -> int:
        # на паузе время не идёт: иначе объяснение учителя у доски съедало бы
        # у класса бонус за скорость, а таймер на телефонах доходил бы до нуля
        reference = self.pause_started if self.paused else now_ms()
        return max(0, self.deadline - reference)

    def session_left_ms(self) -> int:
        if not self.session_deadline:
            return self.duration_min * 60_000
        return max(0, self.session_deadline - now_ms())

    def set_phase(self, phase: str, seconds: float | None = None) -> None:
        self.phase = phase
        if seconds is None:
            seconds = PHASE_TIME.get(phase, 10)
        self.phase_started = now_ms()
        self.deadline = now_ms() + int(seconds * 1000)
        if self.paused:
            # фаза создана уже во время паузы (учитель нажал «пропустить»),
            # поэтому при снятии паузы ей не нужно возвращать «просроченное» время
            self.pause_started = now_ms()

    async def start(self) -> None:
        if self.phase != "lobby":
            return
        self.autobalance()
        self.started_at = now_ms()
        self.session_deadline = self.started_at + self.duration_min * 60_000
        self.set_phase("september" if self.mode == "september" else "story")
        await self.broadcast_state()
        self._task = asyncio.create_task(self._loop())

    async def _loop(self) -> None:
        """Тикер: двигает фазы и раз в секунду рассылает лёгкий tick."""
        last_tick = 0
        while not self.finished:
            await asyncio.sleep(0.2)
            if self.paused:
                continue
            try:
                if (not self.time_over and self.session_deadline
                        and now_ms() >= self.session_deadline):
                    self.time_over = True
                    await self.hub.broadcast(self.code, {"t": "bell"})

                # вопрос закрывается на пол-секунды позже нуля таймера: ответ,
                # отправленный в последний момент, успевает дойти через школьный
                # вайфай и не пропадает как «задание уже закрыто»
                grace = GRACE_MS if self.phase == "question" else 0
                if now_ms() >= self.deadline + grace:
                    await self.advance()

                if now_ms() - last_tick >= 1000:
                    last_tick = now_ms()
                    await self.hub.broadcast(self.code, {
                        "t": "tick",
                        "now": now_ms(),
                        "phase_deadline": self.deadline,
                        "session_left": self.session_left_ms(),
                        "answered": self.answered_count(),
                        "online": self.online_count(),
                    })
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                # Урок важнее одной ошибки: если что-то упало, комната не должна
                # замереть — учитель доведёт игру кнопками «пропустить» и «к результатам».
                print(f"[игра {self.code}] сбой в тикере: {type(exc).__name__}: {exc}")
                self.deadline = now_ms() + 3000

    def answered_count(self) -> int:
        return sum(1 for a in self.answers.values() if a.get("done"))

    def online_count(self) -> int:
        return sum(1 for p in self.players.values() if p.connected)

    async def advance(self) -> None:
        """Переход к следующей фазе по таймеру или по кнопке учителя."""
        phase = self.phase

        if phase == "september":
            self.set_phase("story")
        elif phase == "story":
            self.set_phase("map")
        elif phase == "map":
            if self.time_over:
                return await self.to_results()
            self.set_phase("mission_intro")
        elif phase == "mission_intro":
            self.question_index = 0
            return await self.ask_question()
        elif phase == "question":
            return await self.close_question()
        elif phase == "reveal":
            if self.question_index + 1 < len(self.mission["questions"]):
                self.question_index += 1
                return await self.ask_question()
            return await self.finish_mission()
        elif phase == "mission_complete":
            if self.mission_index + 1 < len(self.missions):
                self.mission_index += 1
                if self.time_over:
                    return await self.to_results()
                self.set_phase("map")
            else:
                self.set_phase("victory")
        elif phase == "victory":
            return await self.to_results()
        elif phase == "results":
            self.set_phase("awards", 3600)
            self.compute_awards()
        elif phase == "awards":
            self.deadline = now_ms() + 3600_000
            return

        await self.broadcast_state()

    async def ask_question(self) -> None:
        q = self.mission["questions"][self.question_index]
        # перемешиваем один раз за игру: иначе после «предыдущего задания»
        # сказанное учителем «правильный был вариант В» перестанет быть правдой
        built = self.views.get(q["id"])
        if built is None:
            built = make_view(q, self.rng)
            self.views[q["id"]] = built
        self.current_q = q
        self.current_view = built["view"]
        self.current_order = built["order"]
        # у заданий, к которым учитель вернулся, ответы сохраняются: кто уже
        # ответил — не отвечает и не получает баллы второй раз
        self.answers = self.answers_history.setdefault(q["id"], {})
        self.global_index = sum(len(m["questions"]) for m in self.missions[:self.mission_index]) \
            + self.question_index + 1
        self.question_window_ms = q["time_limit"] * 1000
        self.set_phase("question", q["time_limit"])
        await self.broadcast_state()

    async def close_question(self) -> None:
        """Закрывает вопрос: считает статистику команд и открывает ответ."""
        q, order = self.current_q, self.current_order
        self.finalize_pending()
        stats = {tid: {"correct": 0, "answered": 0} for tid in self.teams}
        for pid, a in self.answers.items():
            p = self.players.get(pid)
            if not p or not p.team_id:
                continue
            stats[p.team_id]["answered"] += 1
            if a.get("correct"):
                stats[p.team_id]["correct"] += 1

        answered = sum(s["answered"] for s in stats.values())
        correct = sum(s["correct"] for s in stats.values())
        share = correct / answered if answered else 0.0

        if self.mission["district"] == "tower" and q["id"] not in self.scored_tower:
            self.scored_tower.add(q["id"])   # повтор задания не бьёт по башне второй раз
            step = 100.0 / max(1, len(self.mission["questions"]))
            # даже при слабом ответе башня теряет часть энергии — игра обязана закончиться
            self.chaos_hp = max(0.0, self.chaos_hp - step * (0.45 + 0.55 * share))
            if len(self.scored_tower) >= len(self.mission["questions"]):
                self.chaos_hp = 0.0

        row = {
            "index": self.global_index, "id": q["id"], "district": self.mission["district"],
            "type": q["type"], "question": q["question"], "topic": q.get("topic", ""),
            "answered": answered, "correct": correct,
            "accuracy": round(share, 3),
        }
        existing = next((i for i, r in enumerate(self.log) if r["id"] == q["id"]), None)
        if existing is None:
            self.log.append(row)
        else:
            self.log[existing] = row

        self.last_reveal = reveal_payload(q, order) | {
            "answered": answered, "correct": correct, "share": round(share, 3),
            "chaos_hp": round(self.chaos_hp, 1),
        }
        self.set_phase("reveal")
        await self.broadcast_state()

    async def finish_mission(self) -> None:
        m = self.mission
        total = len(m["questions"])
        rows = sorted(
            (t.public(len(self.team_members(t.id))) | {
                "district_accuracy": round(t.district_accuracy(m["district"]), 3)}
             for t in self.teams.values()),
            key=lambda r: -r["score"])
        self.mission_report = {
            "district": m["district"], "title": m["title"], "icon": m["icon"],
            "zone": m["zone"], "questions": total, "teams": rows,
            "restored": self.mission_index + 1, "of": len(self.missions),
        }
        self.set_phase("mission_complete")
        await self.broadcast_state()

    def has_previous(self) -> bool:
        """Есть ли задание, к которому учитель может вернуться."""
        if self.phase in ("question", "reveal"):
            return self.question_index > 0 or self.mission_index > 0 or self.phase == "reveal"
        return bool(self.current_q)

    async def go_back(self) -> None:
        """Вернуть класс к предыдущему заданию (ученик попросил повторить).

        На разборе возвращает текущее задание, на задании — предыдущее.
        Баллы за уже отвеченное не начисляются повторно: ответы сохранены.
        """
        if self.phase == "reveal" and self.current_q:
            return await self.ask_question()

        if self.phase == "question":
            if self.question_index > 0:
                self.question_index -= 1
            elif self.mission_index > 0:
                self.mission_index -= 1
                self.question_index = len(self.mission["questions"]) - 1
            else:
                return
            return await self.ask_question()

        if self.current_q:                      # со служебных экранов — к заданию
            return await self.ask_question()

    async def to_results(self) -> None:
        self.ranking = sorted(
            (t.public(len(self.team_members(t.id))) for t in self.teams.values()),
            key=lambda r: (-r["score"], -r["accuracy"]))
        for i, row in enumerate(self.ranking):
            row["place"] = i + 1
        self.compute_awards()
        self.set_phase("results")
        await self.broadcast_state()

    # ---------------------------------------------------------------- ответы

    async def submit(self, player: Player, qid: str, payload) -> dict:
        if self.phase != "question" or not self.current_q:
            return {"ok": False, "reason": "closed"}
        if qid != self.current_q["id"]:
            return {"ok": False, "reason": "stale"}
        if not player.team_id:
            return {"ok": False, "reason": "no_team"}

        rec = self.answers.setdefault(player.id, {"attempts": 0, "done": False,
                                                  "correct": False, "started": self.deadline})
        if rec["done"]:
            return {"ok": False, "reason": "already"}  # повторная отправка запрещена (ТЗ §42)

        rec["attempts"] += 1
        correct = check(self.current_q, self.current_order, payload)
        q = self.current_q
        team = self.teams.get(player.team_id)
        window_ms = self.question_window_ms or q["time_limit"] * 1000
        left_ms = min(self.phase_left_ms(), window_ms)
        spent_ms = max(0, window_ms - left_ms)

        if correct:
            base = q["points"]
            if rec["attempts"] == 1:
                speed = left_ms / window_ms
                gained = int(round(base + base * 0.5 * speed))
            else:
                gained = max(1, base // 2)
            rec.update(done=True, correct=True, points=gained)
            player.correct += 1
            player.answered += 1
            player.score += gained
            player.total_ms += spent_ms
            player.streak += 1
            player.best_streak = max(player.best_streak, player.streak)
            if team:
                team.score += gained
                team.correct += 1
                team.answered += 1
                team.total_ms += spent_ms
                d = self.mission["district"]
                team.topic_correct[d] = team.topic_correct.get(d, 0) + 1
                team.topic_answered[d] = team.topic_answered.get(d, 0) + 1
            await self.broadcast_scores()
            await self.maybe_early_close()
            return {"ok": True, "correct": True, "points": gained,
                    "team_score": team.score if team else 0,
                    "streak": player.streak}

        # неверно
        attempts_left = MAX_ATTEMPTS - rec["attempts"]
        if attempts_left <= 0:
            rec.update(done=True, correct=False, points=0)
            player.answered += 1
            player.streak = 0
            if team:
                team.answered += 1
                d = self.mission["district"]
                team.topic_answered[d] = team.topic_answered.get(d, 0) + 1
            await self.broadcast_scores()
            await self.maybe_early_close()
        return {"ok": True, "correct": False, "attempts_left": max(0, attempts_left),
                "hint": self.current_q.get("hint", "")}

    def finalize_pending(self) -> None:
        """Ошибка, после которой ученик не успел ответить второй раз, — тоже ошибка.

        Без этого в статистику команды попадали бы только верные ответы.
        Тот, кто не нажал вообще ничего, в точность не идёт: класс большой,
        кто-то отвлёкся — наказывать команду за это незачем.
        """
        for pid, rec in self.answers.items():
            if rec.get("done") or not rec.get("attempts"):
                continue
            rec.update(done=True, correct=False, points=0)
            player = self.players.get(pid)
            if not player:
                continue
            player.answered += 1
            player.streak = 0
            team = self.teams.get(player.team_id)
            if team:
                team.answered += 1
                d = self.mission["district"]
                team.topic_answered[d] = team.topic_answered.get(d, 0) + 1

    async def maybe_early_close(self) -> None:
        """Если ответили все, кто в сети, — не ждём таймер зря."""
        online = [p for p in self.players.values() if p.connected and p.team_id]
        if not online:
            return
        if all(self.answers.get(p.id, {}).get("done") for p in online):
            self.deadline = min(self.deadline, now_ms() + 1500)

    # ---------------------------------------------------------------- награды

    def compute_awards(self) -> None:
        """Пять специальных наград (ТЗ §30).

        При равных показателях награда уходит команде, у которой её ещё нет:
        пять грамот одной команде — скучный финал для класса.
        """
        teams = [t for t in self.teams.values() if t.answered > 0]
        if not teams:
            self.awards = []
            return

        awarded: set[str] = set()

        def pick(metric, best=max, positive_only=True):
            pool = [t for t in teams if not positive_only or metric(t) > 0]
            if not pool:
                return None
            target = best(metric(t) for t in pool)
            tied = [t for t in pool if abs(metric(t) - target) < 1e-9]
            winner = next((t for t in tied if t.id not in awarded), tied[0])
            awarded.add(winner.id)
            return winner

        punctuation = lambda t: (t.district_accuracy("syntax") + t.district_accuracy("archive")) / 2
        combo = lambda t: t.accuracy * (30_000 / max(t.avg_ms, 1_000))

        plan = [
            ("lexicon", "🧠", "МАСТЕРА СЛОВА", lambda t: t.district_accuracy("words"), max, True,
             lambda t: f"{round(t.district_accuracy('words') * 100)}% в Районе слов"),
            ("punctuation", "✍️", "ПОВЕЛИТЕЛИ ЗАПЯТЫХ", punctuation, max, True,
             lambda t: f"{round(punctuation(t) * 100)}% на мосту и в архиве"),
            ("speed", "⚡", "СКОРОСТНАЯ КОМАНДА", lambda t: t.avg_ms, min, False,
             lambda t: f"{t.avg_ms / 1000:.1f} с на верный ответ"),
            ("accuracy", "🎯", "СНАЙПЕРЫ ПРАВИЛ", lambda t: t.accuracy, max, True,
             lambda t: f"{round(t.accuracy * 100)}% точности"),
            ("combo", "🤝", "КОМАНДА ГОДА", combo, max, True,
             lambda t: f"{round(t.accuracy * 100)}% при {t.avg_ms / 1000:.1f} с на ответ"),
        ]

        awards = []
        for key, emoji, title, metric, best, positive, fmt in plan:
            if key == "speed":
                pool_ok = any(t.correct for t in teams)
                if not pool_ok:
                    continue
                winner = pick(lambda t: t.avg_ms if t.correct else 10**9, min, False)
            else:
                winner = pick(metric, best, positive)
            if not winner:
                continue
            awards.append({
                "id": key, "emoji": emoji, "title": title,
                "team": winner.public(len(self.team_members(winner.id))),
                "value": fmt(winner),
            })
        self.awards = awards

    # ---------------------------------------------------------------- снапшот

    def teams_public(self) -> list[dict]:
        rows = [t.public(len(self.team_members(t.id))) for t in self.teams.values()]
        return sorted(rows, key=lambda r: -r["score"])

    def snapshot(self, player: Player | None = None, teacher: bool = False) -> dict:
        m = self.mission
        data = {
            "t": "state",
            "code": self.code,
            "grade": self.grade,
            "mode": self.mode,
            "phase": self.phase,
            "paused": self.paused,
            "now": now_ms(),
            "phase_deadline": self.deadline,
            "phase_started": self.phase_started,
            "session_left": self.session_left_ms(),
            "duration_min": self.duration_min,
            "time_over": self.time_over,
            "teams": self.teams_public(),
            "online": self.online_count(),
            "players_total": len(self.players),
            "mission": {
                "index": self.mission_index, "of": len(self.missions),
                "district": m["district"], "title": m["title"], "icon": m["icon"],
                "zone": m["zone"], "subtitle": m["subtitle"], "brief": m["brief"],
                "questions": len(m["questions"]),
            },
            "map": [
                {"district": mm["district"], "title": mm["title"], "icon": mm["icon"],
                 "zone": mm["zone"],
                 "state": ("done" if i < self.mission_index else
                           "active" if i == self.mission_index else "locked")}
                for i, mm in enumerate(self.missions)
            ],
            "question_no": self.question_index + 1,
            "global_index": self.global_index,
            "total_questions": self.total_questions,
            "chaos_hp": round(self.chaos_hp, 1),
            "mission_report": self.mission_report,
            "ranking": self.ranking,
            "awards": self.awards,
        }

        if self.phase == "question" and self.current_view:
            data["question"] = self.current_view
        if self.phase == "reveal" and self.last_reveal:
            data["reveal"] = self.last_reveal

        if player:
            rec = self.answers.get(player.id, {})
            data["me"] = player.public() | {
                "answer_done": bool(rec.get("done")),
                "answer_correct": bool(rec.get("correct")),
                "answer_points": rec.get("points", 0),
                "attempts": rec.get("attempts", 0),
            }
        if teacher:
            data["players"] = [p.public() for p in self.players.values()]
            data["answered"] = self.answered_count()
            data["log"] = self.log[-40:]
            data["can_go_back"] = self.has_previous()
            if self.phase in ("question", "reveal") and self.current_q:
                data["teacher_answer"] = reveal_payload(self.current_q, self.current_order)
        return data

    async def broadcast_state(self) -> None:
        await self.hub.push_state(self.code)

    async def broadcast_scores(self) -> None:
        await self.hub.broadcast(self.code, {
            "t": "scores", "teams": self.teams_public(),
            "answered": self.answered_count(), "online": self.online_count(),
            "chaos_hp": round(self.chaos_hp, 1),
        })

    # ---------------------------------------------------------------- учитель

    async def teacher_action(self, action: str, value=None) -> None:
        if action == "start":
            await self.start()
        elif action == "pause":
            if not self.paused:
                self.paused = True
                self.pause_started = now_ms()
                await self.broadcast_state()
        elif action == "resume":
            if self.paused:
                delta = now_ms() - self.pause_started
                self.deadline += delta
                if self.session_deadline:
                    self.session_deadline += delta
                self.paused = False
                await self.broadcast_state()
        elif action == "skip":
            self.deadline = now_ms()
            await self.advance()
        elif action == "back":
            await self.go_back()
        elif action == "add_time":
            extra = int(value or 300) * 1000
            self.session_deadline += extra
            self.time_over = False
            await self.broadcast_state()
        elif action == "extend_question":
            if self.phase == "question":
                extra = int(value or 15) * 1000
                self.deadline += extra
                self.question_window_ms += extra
                await self.broadcast_state()
        elif action == "finish":
            if self.phase == "question" and self.current_q:
                await self.close_question()   # иначе задание пропадёт из разбора
            await self.to_results()

    def analytics(self) -> dict:
        """Итоговая выгрузка для учителя (ТЗ §40 «Analytics»)."""
        by_topic: dict[str, dict] = {}
        for row in self.log:
            key = row["district"]
            agg = by_topic.setdefault(key, {"answered": 0, "correct": 0, "questions": 0,
                                            "title": DISTRICT_BY_ID[key]["title"],
                                            "icon": DISTRICT_BY_ID[key]["icon"]})
            agg["answered"] += row["answered"]
            agg["correct"] += row["correct"]
            agg["questions"] += 1
        for agg in by_topic.values():
            agg["accuracy"] = round(agg["correct"] / agg["answered"], 3) if agg["answered"] else 0
        hardest = sorted([r for r in self.log if r["answered"]], key=lambda r: r["accuracy"])[:5]
        return {
            "code": self.code, "grade": self.grade,
            "teams": self.teams_public(),
            "players": sorted((p.public() for p in self.players.values()),
                              key=lambda p: -p["score"]),
            "awards": self.awards,
            "by_district": by_topic,
            "hardest": hardest,
            "questions": self.log,
        }
