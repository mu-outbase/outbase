# Whole-trip hourly weather

The HOME forecast now offers a day button for each forecast day in the trip. The detail panel defaults to one-hour intervals and provides all-period and individual-day filters. The hourly section opens directly in view; advice remains available below it.

Plan detail retains the actual check-in and checkout times rather than expanding to midnight boundaries. Three-hour mode retains the first and final available hour. Missing forecast coverage is identified rather than filled with invented values. Existing Open-Meteo integration is reused.

Validation: 13 Node tests passed, syntax checks and diff checks passed. Pixel 7 browser emulation verified November 22 09:00 through November 24 10:00: 50 hourly observations, daily counts 15/24/11, overnight weather, final-day temperatures, three-hour checkout boundary, refresh preserving filters, reopening and no horizontal overflow. Calendar editor, location selection, deferred PWA updates, record retention and offline regressions passed. Browser forecast fixtures validate UI behavior; physical Android validation is not claimed.
