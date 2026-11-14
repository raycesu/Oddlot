"""Round-lot netting: residual = OI − 100 × lots_hedged."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal


@dataclass
class SeriesBookState:
    series: str
    open_interest: int
    lots_hedged: int
    kind: Literal["call", "put"] = "put"
    strike: Decimal = Decimal("0")
    width: Decimal = Decimal("0")

    @property
    def residual(self) -> int:
        return self.open_interest - 100 * self.lots_hedged


@dataclass(frozen=True)
class ListedFill:
    series: str
    qty: int
    fill: Decimal
    ts: str


def apply_round_lot_netting(
    state: SeriesBookState,
    round_lot: int = 100,
    fill_price: Decimal = Decimal("0"),
    now: datetime | None = None,
) -> list[ListedFill]:
    """While residual ≥ round_lot, paper-buy one listed spread and log the fill."""
    fills: list[ListedFill] = []
    stamp = (now or datetime.now(timezone.utc)).isoformat().replace("+00:00", "Z")
    while state.open_interest - round_lot * state.lots_hedged >= round_lot:
        state.lots_hedged += 1
        fills.append(
            ListedFill(
                series=state.series,
                qty=1,
                fill=fill_price,
                ts=stamp,
            )
        )
    return fills
