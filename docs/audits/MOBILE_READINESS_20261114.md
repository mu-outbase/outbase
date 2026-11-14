# Mobile and PWA readiness — 2026-11-14

## Automated mobile evidence

`tests/mobile-navigation-flow.py` uses Playwright's Pixel 7 device profile (touch, mobile viewport and Android user agent) with disposable storage. This is Chromium emulation, not an Android hardware test.

Passed: activity detail → preparation → execution → one Back returns to preparation and restores scroll; browser Back returns to the same activity; navigating and displaying these screens leaves the saved activity unchanged; HOME opens offline; checked pages have no horizontal overflow. The PWA start shortcut opens the current start screen, selects the existing activity without creating or mutating activities, and browser Back returns to selection in one step. No page errors.

## Shortcut correction

The manifest previously sent “活動を始める” to `?tab=record&sheet=start`, opening the legacy runtime instead of the current shell. It now targets `?shell=1&view=start`. App id, scope and installed-app identity are unchanged; data clearing or uninstalling is not part of the update. The Service Worker cache name changes to deliver the manifest. OS refresh timing of shortcuts on an already installed Android app remains unverified.

## Remaining device gate

Actual Android GPS permission/accuracy, physical camera and microphone capture, screen-off/foreground return, and installed-PWA update/launcher behavior still need hardware verification. The current execution screen stops GPS when hidden; screen Wake Lock currently exists only in the legacy implementation. The automated checks do not certify physical-device behavior or full MVP completion.

Earlier regression coverage also includes media preservation, atomic improvement-to-preparation transfer, startup request recovery, old-worker updates and offline operation. This audit records the mobile navigation and shortcut work specifically, without replacing those tests or marking older Android checklists complete.
