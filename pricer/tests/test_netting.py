"""M2: round-lot netting 144 tokens → 1 lot, residual 44."""

from __future__ import annotations

from decimal import Decimal

from oddlot_pricer.hedger.netting import SeriesBookState, apply_round_lot_netting


def test_netting_144_tokens_one_lot_residual_44() -> None:
    state = SeriesBookState(
        series="series-put-780-740",
        open_interest=144,
        lots_hedged=0,
        kind="put",
        strike=Decimal("780"),
        width=Decimal("40"),
    )
    fills = apply_round_lot_netting(
        state,
        round_lot=100,
        fill_price=Decimal("13.6854"),
    )
    assert len(fills) == 1
    assert fills[0].qty == 1
    assert state.lots_hedged == 1
    assert state.residual == 44
    assert state.open_interest == 144
