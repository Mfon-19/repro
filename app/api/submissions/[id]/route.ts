import { NextResponse, type NextRequest } from 'next/server';

import { fetchSubmission } from '../../_lib/submissions';
import { getSession } from '../../_lib/session';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(request);
  if (!session?.userId) {
    return NextResponse.json({ error: 'unauthorized', message: 'login required' }, { status: 401 });
  }

  const { id } = await params;
  const submission = await fetchSubmission(id);
  if (!submission) {
    return NextResponse.json({ error: 'not_found', message: 'submission not found' }, { status: 404 });
  }

  if (!submission.user_id || submission.user_id !== session.userId) {
    return NextResponse.json({ error: 'forbidden', message: 'not allowed' }, { status: 403 });
  }

  let result = submission.result_json;
  if (typeof result === 'string') {
    try {
      result = JSON.parse(result);
    } catch {
      result = submission.result_json;
    }
  }

  return NextResponse.json({
    id: submission.id,
    job_id: submission.job_id,
    status: submission.status,
    stage: submission.stage,
    progress_pct: submission.progress_pct,
    language: submission.language,
    runtime: submission.runtime,
    result,
    result_blob_url: submission.result_blob_url,
    exit_code: submission.exit_code,
    duration_ms: submission.duration_ms,
    error: submission.error_message,
    updated_at: submission.updated_at,
    created_at: submission.created_at,
  });
}
