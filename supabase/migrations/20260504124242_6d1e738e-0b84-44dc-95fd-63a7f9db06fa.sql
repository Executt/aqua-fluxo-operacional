CREATE OR REPLACE FUNCTION public.get_metabase_refresh_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_job        record;
  v_runs       jsonb;
  v_last_run   record;
  v_last_ok    record;
  v_secs_since bigint;
BEGIN
  SELECT jobid, jobname, schedule, active
    INTO v_job
  FROM cron.job
  WHERE jobname = 'refresh_metabase_views_15min'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'scheduled', false,
      'message', 'Job refresh_metabase_views_15min não está agendado.',
      'job', NULL,
      'last_runs', '[]'::jsonb,
      'last_run', NULL,
      'last_success_at', NULL,
      'seconds_since_last_success', NULL,
      'is_overdue', true,
      'is_failing', false
    );
  END IF;

  SELECT jsonb_agg(r ORDER BY r->>'start_time' DESC) INTO v_runs
  FROM (
    SELECT jsonb_build_object(
      'status', status,
      'return_message', return_message,
      'start_time', start_time,
      'end_time', end_time
    ) AS r
    FROM cron.job_run_details
    WHERE jobid = v_job.jobid
    ORDER BY start_time DESC
    LIMIT 10
  ) sub;

  SELECT * INTO v_last_run
  FROM cron.job_run_details
  WHERE jobid = v_job.jobid
  ORDER BY start_time DESC
  LIMIT 1;

  SELECT * INTO v_last_ok
  FROM cron.job_run_details
  WHERE jobid = v_job.jobid AND status = 'succeeded'
  ORDER BY start_time DESC
  LIMIT 1;

  v_secs_since := CASE
    WHEN v_last_ok.start_time IS NOT NULL
    THEN EXTRACT(EPOCH FROM (now() - v_last_ok.start_time))::bigint
    ELSE NULL
  END;

  RETURN jsonb_build_object(
    'scheduled', v_job.active,
    'job', jsonb_build_object(
      'jobname', v_job.jobname,
      'schedule', v_job.schedule,
      'active', v_job.active
    ),
    'last_runs', COALESCE(v_runs, '[]'::jsonb),
    'last_run', CASE WHEN v_last_run.start_time IS NOT NULL THEN
      jsonb_build_object(
        'status', v_last_run.status,
        'return_message', v_last_run.return_message,
        'start_time', v_last_run.start_time,
        'end_time', v_last_run.end_time
      ) ELSE NULL END,
    'last_success_at', v_last_ok.start_time,
    'seconds_since_last_success', v_secs_since,
    'is_overdue', COALESCE(v_secs_since > 20*60, true),
    'is_failing', COALESCE(v_last_run.status = 'failed', false)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_metabase_refresh_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_metabase_refresh_status() TO service_role;