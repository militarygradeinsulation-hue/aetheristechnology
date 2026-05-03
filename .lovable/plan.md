I found the actual failure: the feed is pulling articles from RSS sources, but the database write is failing with `ON CONFLICT DO UPDATE command cannot affect row a second time`. That happens when multiple feeds return duplicate article links in the same batch. Because the upsert fails, zero articles are saved, so the page shows empty even though the backend says it ingested 201 items.

Plan:

1. Fix ingestion so duplicate links cannot break the whole feed
   - Deduplicate articles by normalized URL before writing to the database.
   - Strip tracking fragments/query noise where safe so the same article is not treated as multiple records.
   - Prefer the freshest/most complete version when duplicates exist.
   - Only mark `last_refresh` successful after the database write succeeds.
   - Return useful counts: fetched, deduped, saved, and current cache size.

2. Make the public page resilient instead of silently empty
   - Show a clear live-feed status if a refresh is running or if sources fail.
   - If one category has no articles, keep the page from looking broken and guide users back to “All”.
   - Keep the existing dark forensic styling and Aetheris Dispatches sidebar.

3. Add a manual and automatic refresh path that actually populates visible data
   - Keep the public `list` endpoint auto-refreshing when the cache is stale or empty.
   - Update the refresh action to fail loudly if the cache was not updated, instead of returning `ok: true` while saving nothing.
   - Optionally schedule the backend refresh on a recurring interval after the manual test passes, so the page stays current without someone clicking Refresh.

4. Verify before considering it live
   - Deploy the fixed `industry-news` backend function.
   - Trigger a refresh against the deployed backend.
   - Query the database to confirm articles were saved.
   - Call the `list` endpoint and confirm it returns real article objects.
   - Check the `/news` browser preview/network response to confirm articles render on the page.
   - I will not stop at “ingested count”; I’ll verify actual visible items are returned and displayed.