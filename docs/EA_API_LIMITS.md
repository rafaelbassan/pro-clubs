# EA API history limits (probe 2026-07-09, club_id=240)

The EA Pro Clubs API returns **at most the available recent matches** per `matchType` call.
Increasing `maxResultCount` beyond 10 does not return more rows when fewer exist.
Tested offset/page parameters (`offset`, `start`, `page`, `pageIndex`) return the same set.

**Implication:** full match history must be accumulated in PostgreSQL over time via on-demand sync.
Authenticated users see everything stored since the first sync for that club.

Run the probe:

```bash
python packages/ea-client/scripts/probe_history.py --club-id 240 --json
```
