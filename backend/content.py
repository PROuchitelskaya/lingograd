"""ЛИНГОГРАД — банк заданий: загрузка, публичная проекция, проверка ответов.

Сервер никогда не отдаёт клиенту correct_answer и explanation до фазы reveal
(ТЗ §46 «Античит»). Варианты перемешиваются один раз на вопрос — одинаково
для всех учеников, чтобы учитель мог обсуждать «вариант Б» вслух.
"""

from __future__ import annotations

import json
import random
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

CONTENT_DIR = Path(__file__).parent / "content"

GRADES = [5, 6, 7, 8, 9, 10, 11]

# Порядок районов = порядок миссий (ТЗ §16)
DISTRICTS = [
    {
        "id": "words",
        "title": "РАЙОН СЛОВ",
        "icon": "📚",
        "zone": "zone-words",
        "subtitle": "Хаос перепутал значения слов",
        "brief": "Словари рассыпаны, синонимы разбежались. Соберите смысл обратно.",
    },
    {
        "id": "morphology",
        "title": "ЛАБОРАТОРИЯ МОРФОЛОГИИ",
        "icon": "🧪",
        "zone": "zone-morph",
        "subtitle": "Окончания исчезли из колб",
        "brief": "Сканеры частей речи сбиты. Определите, кто есть кто.",
    },
    {
        "id": "syntax",
        "title": "СИНТАКСИЧЕСКИЙ МОСТ",
        "icon": "🌉",
        "zone": "zone-syntax",
        "subtitle": "Мост из букв рассыпался",
        "brief": "Каждый верный ответ восстанавливает пролёт моста.",
    },
    {
        "id": "archive",
        "title": "АРХИВ ТЕКСТОВ",
        "icon": "📖",
        "zone": "zone-text",
        "subtitle": "Страницы разлетелись по залам",
        "brief": "Верните текстам порядок и знаки препинания.",
    },
    {
        "id": "tower",
        "title": "БАШНЯ ХАОСА",
        "icon": "🏰",
        "zone": "zone-chaos",
        "subtitle": "Финальная битва",
        "brief": "Каждый верный ответ отнимает энергию у Хаоса.",
    },
]

DISTRICT_BY_ID = {d["id"]: d for d in DISTRICTS}

# Типы заданий (ТЗ §38)
TYPES = {
    "single_choice",
    "multiple_choice",
    "true_false",
    "sort",
    "match",
    "text_input",
    "punctuation",
    "word_build",
    "highlight",
}


# --------------------------------------------------------------------------
# Загрузка банка
# --------------------------------------------------------------------------

@lru_cache(maxsize=None)
def load_bank(grade: int) -> list[dict]:
    """Читает банк класса. 10 и 11 имеют собственные файлы."""
    path = CONTENT_DIR / f"grade_{grade}.json"
    if not path.exists():
        raise FileNotFoundError(f"Нет банка заданий для {grade} класса: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    items = data["questions"] if isinstance(data, dict) else data
    for q in items:
        validate(q)
    return items


def validate(q: dict) -> None:
    if q["type"] not in TYPES:
        raise ValueError(f"{q['id']}: неизвестный тип {q['type']}")
    if q["district"] not in DISTRICT_BY_ID:
        raise ValueError(f"{q['id']}: неизвестный район {q['district']}")
    q.setdefault("points", 10)
    q.setdefault("time_limit", 30)
    q.setdefault("difficulty", 1)
    q.setdefault("explanation", "")


def build_missions(grade: int, rng: random.Random) -> list[dict]:
    """Собирает 5 миссий по районам в порядке DISTRICTS."""
    bank = load_bank(grade)
    missions = []
    for index, district in enumerate(DISTRICTS):
        pool = [q for q in bank if q["district"] == district["id"]]
        pool = sorted(pool, key=lambda q: (q["difficulty"], q["id"]))
        missions.append({
            "index": index,
            "district": district["id"],
            "title": district["title"],
            "icon": district["icon"],
            "zone": district["zone"],
            "subtitle": district["subtitle"],
            "brief": district["brief"],
            "questions": pool,
        })
    return missions


# --------------------------------------------------------------------------
# Публичная проекция вопроса (без правильного ответа)
# --------------------------------------------------------------------------

def make_view(q: dict, rng: random.Random) -> dict:
    """Возвращает то, что видит ученик + служебный порядок для проверки."""
    t = q["type"]
    view: dict = {
        "id": q["id"],
        "type": t,
        "question": q["question"],
        "text": q.get("text", ""),
        "hint": q.get("hint", ""),
        "points": q["points"],
        "time_limit": q["time_limit"],
        "topic": q.get("topic", ""),
    }
    order: dict = {}

    if t in ("single_choice", "multiple_choice"):
        idx = list(range(len(q["answers"])))
        rng.shuffle(idx)
        view["answers"] = [q["answers"][i] for i in idx]
        order["answers"] = idx

    elif t == "true_false":
        view["answers"] = ["ВЕРНО", "НЕВЕРНО"]

    elif t == "sort":
        idx = list(range(len(q["items"])))
        rng.shuffle(idx)
        if idx == sorted(idx) and len(idx) > 1:  # не показывать сразу верный порядок
            idx.reverse()
        view["items"] = [q["items"][i] for i in idx]
        order["items"] = idx
        view["sort_hint"] = q.get("sort_hint", "Расставьте по порядку")

    elif t == "match":
        left = [p[0] for p in q["pairs"]]
        ridx = list(range(len(q["pairs"])))
        rng.shuffle(ridx)
        if ridx == sorted(ridx) and len(ridx) > 1:
            ridx.reverse()
        view["left"] = left
        view["right"] = [q["pairs"][i][1] for i in ridx]
        order["right"] = ridx

    elif t == "text_input":
        view["placeholder"] = q.get("placeholder", "Введите ответ")

    elif t == "punctuation":
        view["tokens"] = q["tokens"]

    elif t == "word_build":
        letters = list(q["correct_answer"].upper().replace("_", ""))
        idx = list(range(len(letters)))
        rng.shuffle(idx)
        view["letters"] = [letters[i] for i in idx]

    elif t == "highlight":
        view["tokens"] = q["tokens"]
        view["multi"] = isinstance(q["correct_answer"], list) and len(q["correct_answer"]) > 1

    return {"view": view, "order": order}


def reveal_payload(q: dict, order: dict) -> dict:
    """Что показать после закрытия вопроса (ТЗ §19–20)."""
    t = q["type"]
    data = {"explanation": q.get("explanation", ""), "type": t}

    if t == "single_choice":
        data["correct_index"] = order["answers"].index(q["correct_answer"])
        data["correct_text"] = q["answers"][q["correct_answer"]]
    elif t == "multiple_choice":
        data["correct_index"] = sorted(order["answers"].index(i) for i in q["correct_answer"])
        data["correct_text"] = ", ".join(q["answers"][i] for i in q["correct_answer"])
    elif t == "true_false":
        data["correct_index"] = 0 if q["correct_answer"] else 1
        data["correct_text"] = "ВЕРНО" if q["correct_answer"] else "НЕВЕРНО"
    elif t == "sort":
        data["correct_text"] = " → ".join(q["items"])
    elif t == "match":
        data["correct_text"] = "; ".join(f"{a} — {b}" for a, b in q["pairs"])
    elif t == "text_input":
        data["correct_text"] = accepted_answers(q)[0]
    elif t == "punctuation":
        data["correct_text"] = render_punctuation(q["tokens"], q["correct_answer"])
    elif t == "word_build":
        data["correct_text"] = q["correct_answer"]
    elif t == "highlight":
        idx = as_list(q["correct_answer"])
        data["correct_text"] = ", ".join(q["tokens"][i] for i in idx)
        data["correct_index"] = idx

    return data


def render_punctuation(tokens: list[str], commas: list[int]) -> str:
    out = []
    for i, tok in enumerate(tokens):
        out.append(tok + ("," if i in commas else ""))
    return " ".join(out)


# --------------------------------------------------------------------------
# Проверка ответа
# --------------------------------------------------------------------------

def normalize(s: str) -> str:
    s = unicodedata.normalize("NFKC", str(s)).strip().lower()
    s = s.replace("ё", "е").replace("’", "'")
    s = re.sub(r"[.!?;:]+$", "", s)
    s = re.sub(r"\s+", " ", s)
    return s


def as_list(v) -> list:
    return list(v) if isinstance(v, (list, tuple)) else [v]


def accepted_answers(q: dict) -> list[str]:
    return [str(a) for a in as_list(q["correct_answer"])]


def check(q: dict, order: dict, payload) -> bool:
    """Проверка ответа на сервере. Любой мусор от клиента = неверный ответ."""
    t = q["type"]
    try:
        if t == "single_choice":
            return order["answers"][int(payload)] == q["correct_answer"]

        if t == "multiple_choice":
            picked = {order["answers"][int(i)] for i in as_list(payload)}
            return picked == set(q["correct_answer"])

        if t == "true_false":
            if isinstance(payload, str):
                payload = normalize(payload) in ("верно", "true", "да", "0")
            return bool(payload) == bool(q["correct_answer"])

        if t == "sort":
            arranged = [order["items"][int(i)] for i in payload]
            return arranged == list(range(len(q["items"])))

        if t == "match":
            if not isinstance(payload, dict):
                return False
            if len(payload) != len(q["pairs"]):
                return False
            for left_str, right_str in payload.items():
                li, ri = int(left_str), int(right_str)
                if order["right"][ri] != li:
                    return False
            return True

        if t == "text_input":
            given = normalize(payload)
            return any(given == normalize(a) for a in accepted_answers(q))

        if t == "punctuation":
            return sorted(int(i) for i in as_list(payload)) == sorted(q["correct_answer"])

        if t == "word_build":
            if isinstance(payload, list):
                payload = "".join(str(x) for x in payload)
            return normalize(payload) == normalize(q["correct_answer"])

        if t == "highlight":
            return sorted(int(i) for i in as_list(payload)) == sorted(as_list(q["correct_answer"]))

    except (KeyError, ValueError, TypeError, IndexError, AttributeError):
        return False

    return False


def bank_stats() -> dict:
    """Сводка по банку — для страницы учителя и самопроверки контента."""
    stats = {}
    for grade in GRADES:
        try:
            bank = load_bank(grade)
        except FileNotFoundError:
            continue
        per_district = {}
        for d in DISTRICTS:
            per_district[d["id"]] = sum(1 for q in bank if q["district"] == d["id"])
        stats[grade] = {"total": len(bank), "districts": per_district}
    return stats
