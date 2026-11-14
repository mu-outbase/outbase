# Runtime module retry — 2026-11-14

After PR 15 deployed, the published calendar regression captured a separate failure: `Unable to load src/storage/non-destructive-export.js` during dynamic runtime loading. Entry dependency recovery and offline HOME passed, but the runtime loader still stopped at a single failed request.

The dynamic loader now retries one request failure while keeping concurrent callers on the same promise. It removes failed elements and clears their handlers/timers. Successful modules remain cached in the loader and are not executed twice. Timeouts are not retried because a timed-out script can still execute late.

The existing main startup fallback now resolves `{status:'failed',error}` after displaying recovery UI, rather than rethrowing a rejection that has no application consumer. Data is neither reset nor migrated. The Service Worker cache is bumped to ship the updated loader and main.

Validation: the runtime-module-flow browser regression injects failure into the actual export-module request. One failure recovers, persistent failure stops consumers and resolves failed status without page errors, retry preserves existing activity and note, and concurrent callers execute a retried fixture only once. Startup dependency regression, old-worker/repeated PWA update, offline execution, calendar regression and Gate2 26/26 passed. Existing loader/main smoke passed for sequential loading, deduplication and separate shell/legacy modes.

This is an additional correction beyond published PR 15. Android device verification remains outstanding.
