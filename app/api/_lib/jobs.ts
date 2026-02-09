import { put } from '@vercel/blob';
import type { NextRequest } from 'next/server';

import { sql } from './db';
import { env } from './env';
import { generateId } from './id';

export type JobRow = {
  id: string;
  user_id?: string | null;
  status: string;
  stage: string;
  progress_pct: number;
  paper_title: string | null;
  paper_filename: string | null;
  paper_blob_url: string | null;
  paper_blob_path?: string | null;
  gemini_file_uri?: string | null;
  gemini_file_mime?: string | null;
  gemini_file_created_at?: string | null;
  result_json: unknown | null;
  result_blob_url: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type JobCreateResult = {
  job: JobRow;
  blob: { url: string; pathname: string; size: number; contentType: string | null };
};

export async function createJobFromUpload(
  request: NextRequest,
  options?: { userId?: string | null }
) {
  const formData = await request.formData();
  const file = formData.get('paper');
  const title = formData.get('title');

  if (!file || !(file instanceof File)) {
    return { error: 'missing_paper_file', message: 'paper file is required' } as const;
  }

  if (file.size === 0) {
    return { error: 'empty_file', message: 'paper file is empty' } as const;
  }

  if (file.type && !file.type.includes('pdf')) {
    return { error: 'invalid_file_type', message: 'only PDF uploads are supported' } as const;
  }

  if (file.size > 50 * 1024 * 1024) {
    return { error: 'payload_too_large', message: 'paper file too large' } as const;
  }

  if (!env.blobToken) {
    return { error: 'blob_not_configured', message: 'blob storage not configured' } as const;
  }

  const jobId = generateId('job');
  const rawName = file.name || 'paper.pdf';
  const filename = rawName.split('/').pop()?.split('\\').pop() || 'paper.pdf';
  const paperTitle = typeof title === 'string' && title.trim().length > 0 ? title.trim() : null;

  await sql`
    insert into jobs (id, user_id, status, stage, progress_pct, paper_title, paper_filename)
    values (${jobId}, ${options?.userId || null}, 'uploading', 'receive_upload', 0, ${paperTitle}, ${filename})
  `;

  try {
    const blob = await put(`papers/${jobId}/${filename}`, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type || 'application/pdf',
    });

    const update = await sql<JobRow>`
      update jobs
      set paper_blob_url = ${blob.url},
          paper_blob_path = ${blob.pathname},
          stage = 'uploaded',
          progress_pct = 10,
          updated_at = now()
      where id = ${jobId}
      returning *
    `;

    return {
      job: update.rows[0],
      blob: {
        url: blob.url,
        pathname: blob.pathname,
        size: file.size,
        contentType: file.type || null,
      },
    } as const;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'blob upload failed';
    await sql`
      update jobs
      set status = 'failed',
          stage = 'upload_failed',
          error_code = 'blob_upload_failed',
          error_message = ${message},
          updated_at = now()
      where id = ${jobId}
    `;
    return { error: 'upload_failed', message } as const;
  }
}

export async function fetchJob(jobId: string) {
  const result = await sql<JobRow>`select * from jobs where id = ${jobId}`;
  return result.rows[0] || null;
}

export async function markJobQueued(jobId: string, userId: string) {
  const result = await sql<JobRow>`
    update jobs
    set status = 'queued',
        stage = 'queued',
        progress_pct = greatest(progress_pct, 15),
        updated_at = now()
    where id = ${jobId}
      and user_id = ${userId}
      and status in ('uploading', 'queued')
    returning *
  `;
  return result.rows[0] || null;
}

export async function claimJob(jobId: string) {
  const result = await sql<JobRow>`
    update jobs
    set status = 'running',
        stage = 'processing',
        progress_pct = greatest(progress_pct, 25),
        claimed_at = now(),
        attempt_count = attempt_count + 1,
        updated_at = now()
    where id = ${jobId} and status = 'queued'
    returning *
  `;
  return result.rows[0] || null;
}

export async function updateGeminiFile(
  jobId: string,
  file: { uri: string; mimeType: string }
) {
  const result = await sql<JobRow>`
    update jobs
    set gemini_file_uri = ${file.uri},
        gemini_file_mime = ${file.mimeType},
        gemini_file_created_at = now(),
        updated_at = now()
    where id = ${jobId}
    returning *
  `;
  return result.rows[0] || null;
}

export async function completeJob(jobId: string, payload: { resultJson: unknown; resultBlobUrl?: string | null; title?: string | null }) {
  const result = await sql<JobRow>`
    update jobs
    set status = 'completed',
        stage = 'completed',
        progress_pct = 100,
        result_json = ${JSON.stringify(payload.resultJson)}::jsonb,
        result_blob_url = ${payload.resultBlobUrl || null},
        paper_title = coalesce(${payload.title || null}, paper_title),
        updated_at = now()
    where id = ${jobId}
    returning *
  `;
  return result.rows[0] || null;
}

export async function failJob(jobId: string, errorCode: string, message: string) {
  const result = await sql<JobRow>`
    update jobs
    set status = 'failed',
        stage = 'failed',
        error_code = ${errorCode},
        error_message = ${message},
        updated_at = now()
    where id = ${jobId}
    returning *
  `;
  return result.rows[0] || null;
}

export function getBaseUrl(request: NextRequest) {
  if (env.appUrl) {
    return env.appUrl.replace(/\/$/, '');
  }
  const url = new URL(request.url);
  return url.origin;
}
