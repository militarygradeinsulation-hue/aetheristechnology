# Golden Report saved-checkpoint recovery

When a scan has saved its 14 synthesized chapters but finalization stops updating, do not start a new website crawl.

1. Open the existing Golden Report by its scan ID while signed in as an authorized Aetheris runner.
2. Confirm that synthesis is done or degraded and that `report.synthesis_incomplete` is not true.
3. Select **Resume finalization from saved evidence**. This runs deterministic report compilation only. It does not restart Firecrawl or AI research.
4. Manual recovery is limited to five total finalizer attempts, including the initial attempt. A report that does not pass the compiler must remain unpublished for review.
5. If status polling fails three times, the screen reports a connection problem instead of showing indefinite progress.

The Golden Report website frontend and `forensic-scan-all` backend must both be deployed for manual saved-checkpoint recovery to work. Do not rerun paid research unless explicitly approved.
