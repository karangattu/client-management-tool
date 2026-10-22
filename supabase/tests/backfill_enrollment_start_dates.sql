-- Run against an empty test database with psql -v ON_ERROR_STOP=1 -f <this file>.
BEGIN;

CREATE TABLE public.program_enrollments (
    id INTEGER PRIMARY KEY,
    status TEXT NOT NULL,
    start_date DATE
);
CREATE TABLE public.program_enrollment_activity (
    enrollment_id INTEGER REFERENCES public.program_enrollments(id),
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_at TIMESTAMPTZ
);

INSERT INTO public.program_enrollments VALUES
    (1, 'enrolled', NULL),
    (2, 'enrolled', '2026-03-01'),
    (3, 'enrolled', NULL),
    (4, 'withdrawn', NULL),
    (5, 'interested', NULL),
    (6, 'enrolled', NULL);

INSERT INTO public.program_enrollment_activity VALUES
    (1, NULL, 'interested', '2025-06-01T12:00:00Z'),
    (1, 'interested', 'enrolled', '2025-06-15T02:30:00Z'),
    (1, 'withdrawn', 'enrolled', '2025-10-15T12:00:00Z'),
    (2, 'interested', 'enrolled', '2026-04-01T12:00:00Z'),
    (4, NULL, 'enrolled', '2025-12-01T07:30:00Z'),
    (5, NULL, 'interested', '2025-06-01T12:00:00Z'),
    (6, 'enrolled', 'enrolled', '2025-06-01T12:00:00Z');

\ir ../migrations/20261022000000_backfill_enrollment_start_dates.sql
\ir ../migrations/20261022000000_backfill_enrollment_start_dates.sql

DO $$
DECLARE
    actual DATE[];
BEGIN
    SELECT array_agg(start_date ORDER BY id) INTO actual
    FROM public.program_enrollments;

    IF actual IS DISTINCT FROM ARRAY[
        '2025-06-14', '2026-03-01', NULL, '2025-11-30', NULL, NULL
    ]::DATE[] THEN
        RAISE EXCEPTION 'Unexpected enrollment start dates: %', actual;
    END IF;
END;
$$;

ROLLBACK;
