# Improvement to preparation — 2026-11-14

Activity detail previously showed saved improvements without a transfer action. The new form explicitly chooses a destination activity and one of shopping, gear, pet supplies or reflection, mapping to the existing preparation categories shopping, gear, pet and note.

The destination must be another undeleted activity in candidate, planned or preparing state. A single IndexedDB transaction rechecks source and destination, inserts the preparation item and marks the source improvement completed with a transfer reference. Original improvement content is preserved. Retries of the same transfer reuse the existing item; conflicting reapplication rejects. Nothing is written on display.

The existing limited improvements projection remains available to older renderers. Separate open and applied projections support the action and transfer history. Links bypass the legacy animation interceptor; forms remain disabled during provisional activity rendering.

Validation: `OUTBASE_TEST_URL=http://127.0.0.1:8766/ python tests/improvement-preparation-flow.py` uses isolated Chromium storage. It covers improvement memo creation, no writes on display, absent destinations, incorrect source, destination already active, rollback after the preparation write, four explicit classifications, double submission, idempotent retry, preparation completion and restoration, offline transfer, applied history navigation and mobile horizontal overflow. Existing memo/calendar browser regressions and Gate2 26/26 passed; existing Node regressions 49/49 passed. PWA old-worker upgrade and successive-update regression passed with the new module manifest.

Android hardware and installed-PWA behavior remain unverified. This is targeted Core04 flow verification, not a declaration that every MVP flow is complete.
