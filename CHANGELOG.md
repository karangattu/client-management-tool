# Changelog

## [1.0.11] - 2026-09-24

### Added

- Prompts staff to submit Employment Support intake when locally saved data is filled
- Auto-syncs draft progress to server on step transitions so team members can see progress
- Warns staff when unsubmitted local drafts are found on the client detail page
- Prevents empty draft records from shadowing completed/submitted intakes
- Automatically links orphaned intakes to active program enrollments
- Unit tests for intake draft progress and completion validation

### Fixed

- Prevented completed intakes from being hidden by newer auto-generated blank drafts
- Fixed orphaned intake records being created without program enrollment links

## [1.0.10]

### Added

- Employment Support engagement report with CSV export from the queue page
- Date-range filters (start/end) for scoping report interactions to a specific period
- Interaction filtering to count only Employment Support-tagged interactions (via `metadata.program_id` / `metadata.program_name`)
- Staff-only authorization check on report generation
- Pacific timezone-aware date boundaries for accurate day-level filtering
- Download button with loading spinner and toast notifications on the Employment Support queue page
- Inline validation preventing export when start date is after end date
- 5 new tests covering report aggregation, CSV escaping, tagged filtering, date range validation, and access control
