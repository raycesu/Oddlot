"""Quote = max(min_premium, round_up_cent((1+spread) × max(BS, crowd)))."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_CEILING
from typing import Literal


@dataclass(frozen=True)
class QuoteResult:
    premium: Decimal
    bs_premium: Decimal
    crowd_premium: Decimal
    source: Literal["bs", "crowd"]


def round_up_cent(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_CEILING)


def build_quote(
    bs_premium: Decimal,
    crowd_premium: Decimal,
    spread: Decimal,
    min_premium: Decimal,
    crowd_available: bool = True,
) -> QuoteResult:
    effective_crowd = crowd_premium if crowd_available else Decimal("0")
    if effective_crowd > bs_premium:
        base = effective_crowd
        source: Literal["bs", "crowd"] = "crowd"
    else:
        base = bs_premium
        source = "bs"

    marked = (Decimal("1") + spread) * base
    premium = max(min_premium, round_up_cent(marked))
    return QuoteResult(
        premium=premium,
        bs_premium=bs_premium,
        crowd_premium=effective_crowd if crowd_available else Decimal("0"),
        source=source,
    )
