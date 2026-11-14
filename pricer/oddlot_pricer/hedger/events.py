"""Bought event decode, discriminator map, webhook dedupe."""

from __future__ import annotations

import base64
import hashlib
import struct
from dataclasses import dataclass
from typing import Any

EVENT_NAMES = (
    "Deposited",
    "Withdrawn",
    "Quoted",
    "Bought",
    "Settled",
    "Exercised",
)

DISC_BY_NAME = {
    name: hashlib.sha256(f"event:{name}".encode()).digest()[:8]
    for name in EVENT_NAMES
}
NAME_BY_DISC = {disc: name for name, disc in DISC_BY_NAME.items()}
BOUGHT_DISCRIMINATOR = DISC_BY_NAME["Bought"]


@dataclass(frozen=True)
class BoughtEvent:
    buyer: bytes
    series: bytes
    qty: int
    cost: int
    spot: int
    ts: int
    signature: str = ""
    event_index: int = 0

    @property
    def buyer_b58_placeholder(self) -> str:
        return self.buyer.hex()

    @property
    def series_b58_placeholder(self) -> str:
        return self.series.hex()


def decode_log_events(encoded_events: list[str]) -> list[BoughtEvent]:
    decoded: list[BoughtEvent] = []
    for index, line in enumerate(encoded_events):
        try:
            raw = base64.b64decode(line)
        except Exception:
            continue
        if len(raw) < 104:
            continue
        name = NAME_BY_DISC.get(raw[:8])
        if name != "Bought":
            continue
        buyer, series, qty, cost, spot, ts = struct.unpack("<32s32sQQQq", raw[8:104])
        decoded.append(
            BoughtEvent(
                buyer=buyer,
                series=series,
                qty=qty,
                cost=cost,
                spot=spot,
                ts=ts,
                event_index=index,
            )
        )
    return decoded


def process_webhook_matches(
    payload: dict[str, Any],
    seen: set[tuple[str, int]],
) -> list[BoughtEvent]:
    """Decode Bought events; ignore unknown discs; dedupe (signature, event_index)."""
    results: list[BoughtEvent] = []
    matches = payload.get("matches") or []
    for match in matches:
        signature = str(match.get("signature") or "")
        encoded = match.get("events") or []
        for event in decode_log_events(encoded):
            key = (signature, event.event_index)
            if key in seen:
                continue
            seen.add(key)
            results.append(
                BoughtEvent(
                    buyer=event.buyer,
                    series=event.series,
                    qty=event.qty,
                    cost=event.cost,
                    spot=event.spot,
                    ts=event.ts,
                    signature=signature,
                    event_index=event.event_index,
                )
            )
    return results
