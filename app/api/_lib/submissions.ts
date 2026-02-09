import { sql } from './db';
import { generateId } from './id';

export type SubmissionRow = {
  id: string;
  job_id: string | null;
  user_id: string | null;
  language: string;
  runtime: string;
  status: string;
  stage: string;
  progress_pct: number;
  submission_filename: string | null;
  submission_blob_url: string | null;
  result_json: unknown | null;
  result_blob_url: string | null;
  exit_code: number | null;
  duration_ms: number | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  claimed_at: string | null;
  attempt_count: number;
};

export async function createSubmission(input: {
  userId: string;
  jobId: string;
  language: string;
  runtime: string;
  filename: string;
  blobUrl: string;
  id?: string;
}) {
  const submissionId = input.id || generateId('submission');
  const result = await sql<SubmissionRow>`
    insert into submissions
      (id, job_id, user_id, language, runtime, status, stage, progress_pct, submission_filename, submission_blob_url)
    values
      (${submissionId}, ${input.jobId}, ${input.userId}, ${input.language}, ${input.runtime}, 'queued', 'receive_upload', 5, ${input.filename}, ${input.blobUrl})
    returning *
  `;
  return result.rows[0];
}

export async function fetchSubmission(id: string) {
  const result = await sql<SubmissionRow>`select * from submissions where id = ${id}`;
  return result.rows[0] || null;
}

export async function claimSubmission(id: string) {
  const result = await sql<SubmissionRow>`
    update submissions
    set status = 'running',
        stage = 'sandbox_start',
        progress_pct = greatest(progress_pct, 10),
        claimed_at = now(),
        attempt_count = attempt_count + 1,
        updated_at = now()
    where id = ${id} and status = 'queued'
    returning *
  `;
  return result.rows[0] || null;
}

export async function updateSubmissionStage(id: string, stage: string, progress: number) {
  const result = await sql<SubmissionRow>`
    update submissions
    set stage = ${stage},
        progress_pct = greatest(progress_pct, ${progress}),
        updated_at = now()
    where id = ${id}
    returning *
  `;
  return result.rows[0] || null;
}

export async function completeSubmission(input: {
  id: string;
  resultJson: unknown;
  resultBlobUrl: string | null;
  exitCode: number | null;
  durationMs: number | null;
}) {
  const result = await sql<SubmissionRow>`
    update submissions
    set status = 'completed',
        stage = 'finalize',
        progress_pct = 100,
        result_json = ${JSON.stringify(input.resultJson)}::jsonb,
        result_blob_url = ${input.resultBlobUrl},
        exit_code = ${input.exitCode},
        duration_ms = ${input.durationMs},
        updated_at = now()
    where id = ${input.id}
    returning *
  `;
  return result.rows[0] || null;
}

export async function failSubmission(input: {
  id: string;
  errorCode: string;
  message: string;
  resultJson?: unknown;
  resultBlobUrl?: string | null;
  exitCode?: number | null;
  durationMs?: number | null;
}) {
  const result = await sql<SubmissionRow>`
    update submissions
    set status = 'failed',
        stage = 'failed',
        error_code = ${input.errorCode},
        error_message = ${input.message},
        result_json = ${input.resultJson ? JSON.stringify(input.resultJson) : null}::jsonb,
        result_blob_url = ${input.resultBlobUrl || null},
        exit_code = ${input.exitCode ?? null},
        duration_ms = ${input.durationMs ?? null},
        updated_at = now()
    where id = ${input.id}
    returning *
  `;
  return result.rows[0] || null;
}
