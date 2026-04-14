

# Scale Down Automation to Weekly

## Current State (6 cron jobs)
- **Job 1**: Old blog gen — daily at 11 UTC
- **Job 2**: Blog morning — daily at 13 UTC (8 AM EST)
- **Job 3**: Blog afternoon — daily at 19 UTC (2 PM EST)
- **Job 4**: Weekly playbook — Mondays at 13 UTC
- **Job 5**: Email queue — every 5 seconds (keep this)
- **Job 6**: Playbook twice daily — 12 & 18 UTC

That's ~4 AI-heavy edge function calls per day burning credits. We'll cut it to 4 per week.

## Changes

### 1. Delete excess cron jobs
Remove jobs 1, 2, 3, and 6 (the daily blog and twice-daily playbook schedules).

### 2. Create two new weekly schedules
- **Weekly blogs**: Monday at 8 AM and 2 PM EST (13 UTC and 19 UTC) — 2 blogs per week
- **Weekly playbooks**: Keep existing job 4 (Monday 13 UTC) + add one more Monday slot — 2 playbooks per week

Final schedule (all Mondays):
| Time (EST) | What |
|---|---|
| 8 AM | 1 blog |
| 9 AM | 1 playbook (existing job 4) |
| 2 PM | 1 blog |
| 3 PM | 1 playbook (new) |

### 3. No code changes needed
The edge functions themselves stay the same — only the cron schedules change.

## Technical Steps
- `SELECT cron.unschedule(1)`, `cron.unschedule(2)`, `cron.unschedule(3)`, `cron.unschedule(6)` to remove old jobs
- Create 2 new weekly blog jobs: `0 13 * * 1` and `0 19 * * 1`
- Create 1 new weekly playbook job: `0 20 * * 1` (keep job 4 as-is)

