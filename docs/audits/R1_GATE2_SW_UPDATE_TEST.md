# R1 Gate 2 — Old Service Worker Update Test

## Purpose

This additive test reproduces a real update from the fixed old OUTBASE source to the current working source on one isolated localhost origin. It verifies the Service Worker lifecycle, cache replacement, preservation of representative rows in OUTBASE's real IndexedDB schemas, and application startup without touching a normal browser profile or production origin.

The test assets do not change `service-worker.js`, `index.html`, `manifest.json`, product JavaScript, or an existing test.

## Isolation boundary

- The default origin is `http://localhost:41745`.
- The runner stops safely if port 41745 is occupied. It never selects another port automatically.
- Edge is started with a newly generated `--user-data-dir` below the operating-system temporary directory.
- Both old and current sources are served from disposable copies below the same generated run directory. The repository itself is never used as the document root.
- The server binds only to the IPv4 loopback address.
- Control endpoints require both a loopback client and a per-run 256-bit token.
- The server can switch only between the two roots supplied by the runner. A request cannot set an arbitrary document root.
- External host resolution is mapped to loopback for the dedicated Edge process. The test connects only to its dedicated localhost origin.

## Prerequisites

- Windows PowerShell 5.1
- Git with commit `b4e8f304639026aa116bf9e6427431f3b5867e61` available locally
- `robocopy.exe`
- Microsoft Edge at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, or an explicitly supplied Edge path
- Free localhost port 41745
- The current working tree containing all five R1 Service Worker update test assets

## Formal command

Run from PowerShell only after the implementation has been reviewed and execution has been authorized:

```powershell
& 'C:\OUTBASE_WORK\outbase\tools\run-r1-sw-update-test.ps1' `
  -Repository 'C:\OUTBASE_WORK\outbase' `
  -OldSha 'b4e8f304639026aa116bf9e6427431f3b5867e61' `
  -Port 41745
```

Do not invoke `serve-r1-sw-update-test.ps1` directly. It is an internal, token-protected server controlled by the runner.

## Fixed old source

The default old source is commit `b4e8f304639026aa116bf9e6427431f3b5867e61`. The runner exports it with `git archive` into its disposable directory; it does not switch, restore, or reset the repository. The two browser test files are copied into the exported source so the same origin and the same test controller can create the old state before the document root changes.

The current source is copied with `robocopy /E /COPY:DAT /DCOPY:DAT /R:1 /W:1 /XJ`, excluding `.git`, into a separate disposable directory. This preserves the uncommitted current source under test without serving or modifying the original repository.

## Update sequence

1. Confirm that the dedicated profile initially has no Service Worker registration, cache, IndexedDB database, localStorage key, or sessionStorage key.
2. Serve the old source and verify the SHA-256 of its delivered `service-worker.js`.
3. Register the old worker, verify it is active, verify cache `outbase-field03-v16631-r3-route-cutover-fix-v222`, and start old HOME.
4. Create representative data in the real OUTBASE database names and schemas discovered from the existing product code.
5. Snapshot database names, versions, stores, indexes, counts, primary keys, values, and Blob hashes, plus a localStorage sentinel.
6. Ask the token-protected server to switch from the fixed old root to the copied current root without changing the origin or listener.
7. Call `registration.update()` and record `updatefound`, installing-worker state changes, `controllerchange`, the old worker becoming redundant, and the current worker becoming activated.
8. Verify the delivered current worker SHA-256 equals the current copied file's SHA-256, cache `outbase-r1-gate2-contract-boundary-v1` exists, and the old cache has been removed.
9. Start current HOME, record重大 JavaScript errors and reload count, and reject an update loop or multiple controller-change reloads.
10. Compare the storage snapshot byte-for-byte at the structured-value level.
11. Perform browser-origin cleanup, report the detailed JSON result, and let the runner perform process/filesystem cleanup in its `finally` path.

## Representative persisted values

The fixture uses the product database names and versions:

- `outbase_db` version 12: `fieldRecords`, `coreImportBlobs`
- `outbase_story_db` version 2: all current stores and indexes, with representative rows in `activities`, `records`, `media`, and `preparation_items`
- `outbase_calendar_db` version 1: all current stores and indexes, with representative rows in `calendars` and `entries`

Rows cover strings, numbers, arrays, nested objects, ISO date text, a real `Date`, and Blobs. Blob type, size, bytes, and SHA-256 are compared. sessionStorage is intentionally excluded from preservation comparison because it is session-scoped; it is nevertheless cleared during cleanup.

## Success conditions

All checks must pass, including:

- old worker active and old cache present before update;
- exactly one `updatefound` and exactly one `controllerchange`;
- installing worker records `installing` and reaches `activated`;
- old worker reaches `redundant`;
- final registration has one active worker, with `installing` and `waiting` both null;
- current worker content hashes match between HTTP delivery and the copied file;
- current cache exists, old cache does not, and major current assets can be read from the current cache;
- old and current HOME both start without重大 JavaScript errors;
- no multiple-reload/update loop is observed;
- all database schemas, counts, primary keys, representative values, Blob metadata/content, and the localStorage sentinel are unchanged;
- browser-origin, process, listener, profile, source-copy, and log cleanup completes;
- repository branch, HEAD, status hash, tracked/untracked counts, and diff stat are unchanged.

Exit code 0 means every test and cleanup condition passed.

## Failure conditions and exit codes

- `0`: all checks passed and cleanup completed.
- `1`: the test ran but one or more update or preservation checks failed.
- `2`: a prerequisite was missing, identity validation failed, the port was occupied, or another safety stop occurred.
- `3`: cleanup was incomplete, the listener remained, or repository final-state verification changed/failed. Cleanup failure overrides another exit code.

The browser emits a detailed JSON result to the token-protected server. The runner prints that result and a final JSON summary to standard output before deleting temporary logs. Repository files are not used for result output.

## Cleanup contract

Browser cleanup unregisters registrations only for the dedicated origin, deletes caches visible only in that dedicated profile/origin, deletes the three exact OUTBASE database names created by the fixture, and clears that origin's local/session storage.

Runner cleanup terminates only Edge processes whose command line contains the generated dedicated profile path. It stops the server only when its PID and command line match the generated run root and server script. It then deletes only the exact generated `OUTBASE_R1_SW_UPDATE_<GUID>` directory below the operating-system temp directory.

Before recursive deletion, the runner validates the generated run identifier, temp parent, repository non-overlap, and Snapshot non-overlap. A PID, path, port, or origin identity mismatch causes a safety failure instead of broad cleanup.

The following are never cleanup targets:

- `C:\OUTBASE_WORK\outbase`
- `C:\OUTBASE_WORK\snapshots`
- normal Edge or Chrome profiles
- any other origin's Service Worker, cache, IndexedDB, or files
- user production data

## Prohibited operations

Do not run this test against a normal profile, a production origin, or an occupied port. Do not edit product files to induce an update. The runner contains no repository reset, restore, clean, checkout, stash, revert, commit, push, or merge operation. It must not be used as a restore or migration tool.

## Why production data is not touched

Browser storage is partitioned by the dedicated `localhost:<port>` origin and a new Edge profile directory. Both the profile and served trees are generated under a uniquely named temp directory. Host-resolution restrictions prevent that Edge process from reaching external production hosts. The repository is read only for archive/copy preparation and final state verification; it is not the server root and is never a cleanup target.

## Additive-only implementation

The update test is implemented only by:

- `tests/r1-sw-update.test.html`
- `tests/r1-sw-update.test.js`
- `tools/serve-r1-sw-update-test.ps1`
- `tools/run-r1-sw-update-test.ps1`
- `docs/audits/R1_GATE2_SW_UPDATE_TEST.md`

No existing product, Service Worker, manifest, registration, or test file needs to be changed.
