import { put } from '@vercel/blob';
import { Client } from '@upstash/qstash';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from './env';
import { createSubmission } from './submissions';
import { getSession } from './session';
import { generateId } from './id';
import { fetchJob, getBaseUrl } from './jobs';
import { resolveProfile } from './sandbox';
import { processSubmission } from './submission-worker';

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;

export async function handleSubmissionUpload(request: NextRequest) {
  const session = getSession(request);

  const formData = await request.formData();
  const submission = formData.get('submission');
  const jobId = formData.get('job_id');
  const language = typeof formData.get('language') === 'string' ? String(formData.get('language')) : 'typescript';

  if (!submission || !(submission instanceof File)) {
    return NextResponse.json({ error: 'missing_submission', message: 'submission zip is required' }, { status: 400 });
  }

  if (!jobId || typeof jobId !== 'string') {
    return NextResponse.json({ error: 'missing_job', message: 'job id is required' }, { status: 400 });
  }

  const job = await fetchJob(jobId);
  if (!job) {
    return NextResponse.json({ error: 'job_not_found', message: 'job not found' }, { status: 404 });
  }
  if (job.user_id) {
    if (!session?.userId) {
      return NextResponse.json({ error: 'unauthorized', message: 'login required' }, { status: 401 });
    }
    if (job.user_id !== session.userId) {
      return NextResponse.json({ error: 'forbidden', message: 'not allowed' }, { status: 403 });
    }
  }

  if (submission.size === 0) {
    return NextResponse.json({ error: 'empty_submission', message: 'submission is empty' }, { status: 400 });
  }

  if (submission.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: 'payload_too_large', message: 'submission too large' }, { status: 413 });
  }

  const submissionId = generateId('submission');
  const filename = submission.name || 'submission.zip';

  const blob = await put(`submissions/${submissionId}/${filename}`, submission, {
    access: 'public',
    addRandomSuffix: true,
    contentType: submission.type || 'application/zip',
  });

  const profile = resolveProfile(language);
  const record = await createSubmission({
    id: submissionId,
    userId: session?.userId || null,
    jobId,
    language: profile.language,
    runtime: profile.runtime,
    filename,
    blobUrl: blob.url,
  });

  if (env.qstashToken) {
    const client = new Client({ token: env.qstashToken, baseUrl: env.qstashUrl });
    const baseUrl = getBaseUrl(request);
    await client.publishJSON({
      url: `${baseUrl}/api/worker/run-submission`,
      body: { submission_id: record.id },
    });
  } else {
    await processSubmission(record.id);
  }

  return NextResponse.json(
    {
      id: record.id,
      status: record.status,
      stage: record.stage,
      progress_pct: record.progress_pct,
      message: 'submission queued for execution',
    },
    { status: 202 }
  );
}
