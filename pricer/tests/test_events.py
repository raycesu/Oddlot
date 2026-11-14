"""M2: Bought event decode, unknown disc ignore, dedupe."""

from __future__ import annotations

import base64
import hashlib
import struct

from oddlot_pricer.hedger.events import (
    BOUGHT_DISCRIMINATOR,
    BoughtEvent,
    decode_log_events,
    process_webhook_matches,
)


def _bought_payload(
    buyer: bytes | None = None,
    series: bytes | None = None,
    qty: int = 44,
    cost: int = 620_400_000,
    spot: int = 780_000_000,
    ts: int = 1_700_000_000,
) -> bytes:
    buyer_bytes = buyer if buyer is not None else bytes(32)
    series_bytes = series if series is not None else bytes(range(32))
    body = struct.pack("<32s32sQQQq", buyer_bytes, series_bytes, qty, cost, spot, ts)
    return BOUGHT_DISCRIMINATOR + body


def test_bought_discriminator_matches_anchor() -> None:
    expected = hashlib.sha256(b"event:Bought").digest()[:8]
    assert BOUGHT_DISCRIMINATOR == expected
    assert list(BOUGHT_DISCRIMINATOR) == [193, 56, 215, 24, 156, 76, 42, 104]


def test_hand_built_bought_decodes() -> None:
    buyer = bytes([1] * 32)
    series = bytes([2] * 32)
    raw = _bought_payload(buyer=buyer, series=series, qty=44, cost=620_400_000)
    events = decode_log_events([base64.b64encode(raw).decode()])
    assert len(events) == 1
    event = events[0]
    assert isinstance(event, BoughtEvent)
    assert event.buyer == buyer
    assert event.series == series
    assert event.qty == 44
    assert event.cost == 620_400_000
    assert event.spot == 780_000_000


def test_unknown_discriminator_ignored() -> None:
    unknown = b"\x00" * 8 + b"\xff" * 96
    events = decode_log_events([base64.b64encode(unknown).decode()])
    assert events == []


def test_dupes_processed_once() -> None:
    raw = base64.b64encode(_bought_payload(qty=44)).decode()
    payload = {
        "matches": [
            {
                "signature": "sigA",
                "slot": 1,
                "blockTime": 1_700_000_000,
                "events": [raw],
            }
        ]
    }
    seen: set[tuple[str, int]] = set()
    first = process_webhook_matches(payload, seen)
    assert len(first) == 1
    assert first[0].qty == 44
    second = process_webhook_matches(payload, seen)
    assert second == []
