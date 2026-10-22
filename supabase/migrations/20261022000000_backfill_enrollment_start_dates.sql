-- Recover missing enrollment start dates from recorded enrollment transitions.
-- Leave dates unknown when there is no recorded transition into enrolled.
WITH first_enrollments AS (
    SELECT enrollment_id, MIN(changed_at) AS enrolled_at
    FROM public.program_enrollment_activity
    WHERE new_status = 'enrolled'
      AND old_status IS DISTINCT FROM 'enrolled'
      AND changed_at IS NOT NULL
    GROUP BY enrollment_id
)
UPDATE public.program_enrollments AS enrollment
SET start_date = (first_enrollments.enrolled_at AT TIME ZONE 'America/Los_Angeles')::DATE
FROM first_enrollments
WHERE enrollment.id = first_enrollments.enrollment_id
  AND enrollment.start_date IS NULL;
