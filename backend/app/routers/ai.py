from __future__ import annotations

import json
import re

import httpx
from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.config import get_settings
from app.models import User
from app.schemas import CategorizeRequest, CategorizeResponse

router = APIRouter(prefix="/ai", tags=["ai"])

HEURISTICS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"mug|cup|tumbler|bottle|drink", re.I), "Drinkware"),
    (re.compile(r"pen|pencil|notebook|journal|stationery|paper", re.I), "Stationery"),
    (re.compile(r"tote|bag|backpack|pouch", re.I), "Bags"),
    (re.compile(r"candle|diffuser|soap|home", re.I), "Home"),
    (re.compile(r"tee|shirt|hoodie|apparel|hat|sock", re.I), "Apparel"),
    (re.compile(r"snack|tea|coffee|food|chocolate", re.I), "Food"),
]


def _heuristic_category(name: str, description: str | None) -> str:
    blob = f"{name} {description or ''}"
    for pattern, category in HEURISTICS:
        if pattern.search(blob):
            return category
    return "General"


@router.post("/categorize", response_model=CategorizeResponse)
def categorize(
    body: CategorizeRequest,
    user: User = Depends(get_current_user),
) -> CategorizeResponse:
    _ = user
    settings = get_settings()
    if not settings.openai_api_key:
        category = _heuristic_category(body.name, body.description)
        return CategorizeResponse(
            category=category,
            source="heuristic",
            detail="No OPENAI_API_KEY set — used local keyword rules.",
        )

    prompt = (
        "Pick one short product category (1-2 words) for a retail inventory item. "
        "Reply with JSON only: {\"category\": \"...\"}.\n"
        f"Name: {body.name}\nDescription: {body.description or ''}"
    )
    try:
        response = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={
                "model": settings.openai_model,
                "messages": [
                    {"role": "system", "content": "You categorize retail products."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0,
                "response_format": {"type": "json_object"},
            },
            timeout=20.0,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        category = json.loads(content).get("category") or _heuristic_category(
            body.name, body.description
        )
        return CategorizeResponse(category=str(category).strip(), source="ai", detail=None)
    except Exception as exc:  # noqa: BLE001 — fall back gracefully
        category = _heuristic_category(body.name, body.description)
        return CategorizeResponse(
            category=category,
            source="heuristic",
            detail=f"AI unavailable ({exc.__class__.__name__}); used keyword rules.",
        )
