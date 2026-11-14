# Decisions log

Record agent decisions here when the PRD leaves something unspecified.

| Date | Decision | Reason | Workstream |
|------|----------|--------|------------|
| 2026-11-14 | Use `.cursor/rules/` instead of `AGENTS.md` | This repo is built in Cursor; project rules replace the PRD's AGENTS.md copy | Scaffold |
| 2026-11-14 | Scaffold only at M0 (dirs, config, schemas, empty modules) | Explicit request: architecture scaffolding before backend/frontend implementation | Scaffold |
| 2026-11-14 | Set `pyth_feed_id` to Hermes Equity.US.SPY/USD id `19e09bb8…c11cd5` | Confirmed via Hermes / Pyth forum; human should re-verify before deploy | Config |
| 2026-11-14 | Program ID `AMUpbS3C4pWo1osN91uVzs1rMLxZvUUrJpQVpkPjZd1n` | Generated local keypair at scaffold; keypair stays out of git | WS1 |
| 2026-11-14 | Commit `idl/oddlot.json` copy of build output | Lets WS3/WS4 depend on a frozen IDL path before M1 account metas land | Scaffold |
