"""Call/put spread payoff helpers (money as Decimal)."""

from __future__ import annotations

from decimal import Decimal
from typing import Literal


def spread_payoff(
    settle: Decimal,
    kind: Literal["call", "put"],
    strike: Decimal,
    width: Decimal,
) -> Decimal:
    if kind == "call":
        intrinsic = settle - strike
    else:
        intrinsic = strike - settle
    if intrinsic <= 0:
        return Decimal("0")
    if intrinsic >= width:
        return width
    return intrinsic
