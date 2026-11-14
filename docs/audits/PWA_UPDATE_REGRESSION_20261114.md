# PWA update regression — 2026-11-14

The sessionStorage reload guard suppressed subsequent controller changes in the same tab. A real worker upgrade activated the new GPS cache while leaving OUTBASE_LOCATION_RECORDER undefined in the old document. No JavaScript exception occurred.

The fix uses a per-document reload guard and bumps the worker cache. Existing pages running the old handler may require one manual reload to receive the corrected index. Do not clear saved data or uninstall the PWA.

## Verification

Run `python tests/execution-pwa-update-flow.py` with Playwright and Chromium. It serves the audio-era worker and modules from commit fb82ff54018511e46d41e1d4c14e1e630576564d, then the working-tree worker and modules, using the working-tree index throughout. All browser storage is disposable.

Passed: old worker active; activity, note, Blob bytes and localStorage unchanged across update; database names and versions unchanged; old cache removed; GPS module loaded automatically; another update in the same tab reloads exactly once; offline execution start persists. No page errors.

Published GPS version ba6c805 also passed execution state, memo and video browser regressions. The integrated calendar/activity domain smoke passed. Android hardware GPS, installed-PWA update and the complete Core04 improvement-to-preparation flow remain unverified. MVP completion is not declared.
