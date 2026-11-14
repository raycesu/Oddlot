"""SQLite hedge book (Postgres in P1)."""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Literal

from oddlot_pricer.hedger.events import BoughtEvent
from oddlot_pricer.hedger.netting import ListedFill, SeriesBookState, apply_round_lot_netting
from oddlot_pricer.hedger.residuals import gemini_residual_targets
from oddlot_pricer.pricing.crowd import GeminiBucket


def _money(value: Decimal | float | int | str) -> str:
    return f"{Decimal(str(value)):.2f}"


@dataclass
class TradeRow:
    signature: str
    ts: str
    buyer: str
    series: str
    kind: Literal["call", "put"]
    qty: int
    cost: str


class HedgeBook:
    def __init__(self, database_url: str = "sqlite:///./oddlot.db") -> None:
        self._path = self._resolve_path(database_url)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self._path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()
        self._seen: set[tuple[str, int]] = set()
        self._load_seen()

    @staticmethod
    def _resolve_path(database_url: str) -> Path:
        if database_url.startswith("sqlite:///"):
            raw = database_url.removeprefix("sqlite:///")
            path = Path(raw)
            if not path.is_absolute():
                return Path.cwd() / path
            return path
        return Path(database_url)

    def _init_schema(self) -> None:
        self._conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS series_state (
                series TEXT PRIMARY KEY,
                open_interest INTEGER NOT NULL,
                lots_hedged INTEGER NOT NULL,
                kind TEXT NOT NULL,
                strike TEXT NOT NULL,
                width TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS listed_spreads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                series TEXT NOT NULL,
                qty INTEGER NOT NULL,
                fill TEXT NOT NULL,
                ts TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS gemini_holdings (
                label TEXT PRIMARY KEY,
                contracts INTEGER NOT NULL,
                avg_price TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                signature TEXT NOT NULL,
                ts TEXT NOT NULL,
                buyer TEXT NOT NULL,
                series TEXT NOT NULL,
                kind TEXT NOT NULL,
                qty INTEGER NOT NULL,
                cost TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS processed_events (
                signature TEXT NOT NULL,
                event_index INTEGER NOT NULL,
                PRIMARY KEY (signature, event_index)
            );
            CREATE TABLE IF NOT EXISTS meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """
        )
        self._conn.commit()
        self._ensure_meta("spyx_shares", "0.00")
        self._ensure_meta("pnl_premiums", "0.00")
        self._ensure_meta("pnl_hedge_mark", "0.00")

    def _ensure_meta(self, key: str, value: str) -> None:
        self._conn.execute(
            "INSERT OR IGNORE INTO meta(key, value) VALUES (?, ?)",
            (key, value),
        )
        self._conn.commit()

    def _load_seen(self) -> None:
        rows = self._conn.execute(
            "SELECT signature, event_index FROM processed_events"
        ).fetchall()
        self._seen = {(row["signature"], int(row["event_index"])) for row in rows}

    @property
    def seen(self) -> set[tuple[str, int]]:
        return self._seen

    def upsert_series(
        self,
        series: str,
        open_interest: int,
        kind: Literal["call", "put"],
        strike: Decimal,
        width: Decimal,
        lots_hedged: int | None = None,
    ) -> SeriesBookState:
        existing = self._conn.execute(
            "SELECT lots_hedged FROM series_state WHERE series = ?",
            (series,),
        ).fetchone()
        lots = (
            lots_hedged
            if lots_hedged is not None
            else (int(existing["lots_hedged"]) if existing else 0)
        )
        self._conn.execute(
            """
            INSERT INTO series_state(series, open_interest, lots_hedged, kind, strike, width)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(series) DO UPDATE SET
                open_interest = excluded.open_interest,
                lots_hedged = excluded.lots_hedged,
                kind = excluded.kind,
                strike = excluded.strike,
                width = excluded.width
            """,
            (series, open_interest, lots, kind, str(strike), str(width)),
        )
        self._conn.commit()
        return SeriesBookState(
            series=series,
            open_interest=open_interest,
            lots_hedged=lots,
            kind=kind,
            strike=strike,
            width=width,
        )

    def get_series(self, series: str) -> SeriesBookState | None:
        row = self._conn.execute(
            "SELECT * FROM series_state WHERE series = ?",
            (series,),
        ).fetchone()
        if row is None:
            return None
        return SeriesBookState(
            series=row["series"],
            open_interest=int(row["open_interest"]),
            lots_hedged=int(row["lots_hedged"]),
            kind=row["kind"],
            strike=Decimal(row["strike"]),
            width=Decimal(row["width"]),
        )

    def record_fills(self, fills: list[ListedFill]) -> None:
        for fill in fills:
            self._conn.execute(
                "INSERT INTO listed_spreads(series, qty, fill, ts) VALUES (?, ?, ?, ?)",
                (fill.series, fill.qty, _money(fill.fill), fill.ts),
            )
        self._conn.commit()

    def save_series_state(self, state: SeriesBookState) -> None:
        self._conn.execute(
            """
            UPDATE series_state
            SET open_interest = ?, lots_hedged = ?, kind = ?, strike = ?, width = ?
            WHERE series = ?
            """,
            (
                state.open_interest,
                state.lots_hedged,
                state.kind,
                str(state.strike),
                str(state.width),
                state.series,
            ),
        )
        self._conn.commit()

    def mark_processed(self, signature: str, event_index: int) -> None:
        self._conn.execute(
            "INSERT OR IGNORE INTO processed_events(signature, event_index) VALUES (?, ?)",
            (signature, event_index),
        )
        self._conn.commit()
        self._seen.add((signature, event_index))

    def add_trade(self, trade: TradeRow) -> None:
        self._conn.execute(
            """
            INSERT INTO trades(signature, ts, buyer, series, kind, qty, cost)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                trade.signature,
                trade.ts,
                trade.buyer,
                trade.series,
                trade.kind,
                trade.qty,
                trade.cost,
            ),
        )
        premiums = Decimal(self._meta("pnl_premiums")) + Decimal(trade.cost)
        self._set_meta("pnl_premiums", _money(premiums))
        self._conn.commit()

    def set_gemini_holdings(
        self,
        targets: list[tuple[str, int, Decimal]],
    ) -> None:
        self._conn.execute("DELETE FROM gemini_holdings")
        for label, contracts, avg_price in targets:
            if contracts <= 0:
                continue
            self._conn.execute(
                "INSERT INTO gemini_holdings(label, contracts, avg_price) VALUES (?, ?, ?)",
                (label, contracts, _money(avg_price)),
            )
        self._conn.commit()

    def set_spyx_shares(self, shares: Decimal) -> None:
        self._set_meta("spyx_shares", f"{shares:.2f}")

    def _meta(self, key: str) -> str:
        row = self._conn.execute(
            "SELECT value FROM meta WHERE key = ?",
            (key,),
        ).fetchone()
        return str(row["value"]) if row else "0.00"

    def _set_meta(self, key: str, value: str) -> None:
        self._conn.execute(
            "INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )
        self._conn.commit()

    def apply_bought(
        self,
        event: BoughtEvent,
        *,
        kind: Literal["call", "put"],
        strike: Decimal,
        width: Decimal,
        fill_price: Decimal,
        round_lot: int = 100,
        year_end: bool = True,
        buckets: list[GeminiBucket] | None = None,
        r: Decimal = Decimal("0.1"),
    ) -> list[ListedFill]:
        series = event.series.hex()
        state = self.get_series(series)
        oi = (state.open_interest if state else 0) + event.qty
        lots = state.lots_hedged if state else 0
        state = self.upsert_series(
            series=series,
            open_interest=oi,
            kind=kind,
            strike=strike,
            width=width,
            lots_hedged=lots,
        )
        fills = apply_round_lot_netting(state, round_lot=round_lot, fill_price=fill_price)
        self.save_series_state(state)
        self.record_fills(fills)

        cost_usd = Decimal(event.cost) / Decimal("1000000")
        ts = datetime.fromtimestamp(event.ts, tz=timezone.utc).isoformat().replace("+00:00", "Z")
        self.add_trade(
            TradeRow(
                signature=event.signature or "unknown",
                ts=ts,
                buyer=event.buyer.hex(),
                series=series,
                kind=kind,
                qty=event.qty,
                cost=_money(cost_usd),
            )
        )
        self.mark_processed(event.signature or "unknown", event.event_index)

        if year_end and buckets is not None:
            targets = gemini_residual_targets(
                residual=state.residual,
                buckets=buckets,
                kind=kind,
                strike=strike,
                width=width,
                r=r,
            )
            self.set_gemini_holdings(
                [
                    (t.label, t.contracts, t.ask or Decimal("0"))
                    for t in targets
                    if t.contracts > 0
                ]
            )
        return fills

    def to_book_dict(self) -> dict[str, Any]:
        asof = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        series_rows = self._conn.execute("SELECT * FROM series_state").fetchall()
        listed_rows = self._conn.execute(
            "SELECT series, qty, fill, ts FROM listed_spreads ORDER BY id"
        ).fetchall()
        gemini_rows = self._conn.execute(
            "SELECT label, contracts, avg_price FROM gemini_holdings"
        ).fetchall()
        premiums = Decimal(self._meta("pnl_premiums"))
        hedge_mark = Decimal(self._meta("pnl_hedge_mark"))
        return {
            "asof": asof,
            "series": [
                {
                    "series": row["series"],
                    "open_interest": int(row["open_interest"]),
                    "lots_hedged": int(row["lots_hedged"]),
                    "residual": int(row["open_interest"]) - 100 * int(row["lots_hedged"]),
                }
                for row in series_rows
            ],
            "listed_spreads": [
                {
                    "series": row["series"],
                    "qty": int(row["qty"]),
                    "fill": row["fill"],
                    "ts": row["ts"],
                }
                for row in listed_rows
            ],
            "gemini": [
                {
                    "label": row["label"],
                    "contracts": int(row["contracts"]),
                    "avg_price": row["avg_price"],
                }
                for row in gemini_rows
            ],
            "spyx_shares": self._meta("spyx_shares"),
            "pnl": {
                "premiums": _money(premiums),
                "hedge_mark": _money(hedge_mark),
                "net": _money(premiums + hedge_mark),
            },
        }

    def to_trades_dict(self, limit: int = 50) -> dict[str, Any]:
        rows = self._conn.execute(
            """
            SELECT signature, ts, buyer, series, kind, qty, cost
            FROM trades
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return {
            "trades": [
                {
                    "signature": row["signature"],
                    "ts": row["ts"],
                    "buyer": row["buyer"],
                    "series": row["series"],
                    "kind": row["kind"],
                    "qty": int(row["qty"]),
                    "cost": row["cost"],
                }
                for row in rows
            ]
        }

    def close(self) -> None:
        self._conn.close()
