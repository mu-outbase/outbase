# Startup dependency resilience — 2026-11-14

## Evidence and scope

A prior published calendar regression captured `Cannot read properties of undefined (reading 'subscribePop')` and `OUTBASE startup dependencies are missing` once. Its failed network requests were not recorded, so the original transport cause remains unconfirmed.

Aborting the router script request in an isolated browser reproduced those exact two errors. Independent deferred scripts continued to run after that dependency failed. The theme accessed an absent router before main reported its missing dependencies.

## Change

A startup entry loads the existing entry scripts in dependency order and checks critical exports before executing consumers. A failed script request gets one retry. Persistent request failures stop startup with a reload action; they do not clear localStorage or IndexedDB. Timeouts stop startup without retry because an execution may still arrive late. Missing exports stop startup without reexecuting a partially loaded script.

The PWA cache includes the startup entry and exact entry-script URLs. Entries are unique, avoiding Cache.addAll duplicate-request failures.

## Validation

`OUTBASE_TEST_URL=http://127.0.0.1:8766/ python tests/startup-dependency-flow.py` uses disposable storage and blocked Service Workers to inject actual script-request failures. Passed: transient failure recovers on the second request with no page errors or database creation; persistent failure stops consumers and shows retry; retry preserves existing activities, notes and localStorage; missing export stops consumers without retrying the script.

Existing browser regressions passed for improvement-to-preparation offline save and restoration, calendar integration and Gate2 26/26. Old-worker upgrade, repeated update in the same tab, Blob/record/schema retention and offline execution start also passed. Existing Node regressions passed 49/49. GPS and audio browser regressions passed. npm run check and startup script syntax checks passed.

Android hardware and installed-PWA verification remain outstanding. This addresses a reproduced startup-failure path and does not prove the exact cause of the earlier one-off transport failure.
