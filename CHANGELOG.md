# Changelog

## [Unreleased]

### Added

- Employment Support engagement report with CSV export from the queue page
- Date-range filters (start/end) for scoping report interactions to a specific period
- Interaction filtering to count only Employment Support-tagged interactions (via `metadata.program_id` / `metadata.program_name`)
- Staff-only authorization check on report generation
- Pacific timezone-aware date boundaries for accurate day-level filtering
- Download button with loading spinner and toast notifications on the Employment Support queue page
- Inline validation preventing export when start date is after end date
- 5 new tests covering report aggregation, CSV escaping, tagged filtering, date range validation, and access control
