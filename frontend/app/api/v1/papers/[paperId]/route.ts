import { NextResponse, type NextRequest } from 'next/server';

import { fetchJob } from '../../../_lib/jobs';
import { getSession } from '../../../_lib/session';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  const session = getSession(_request);
  if (!session?.userId) {
    return NextResponse.json({ error: 'unauthorized', message: 'login required' }, { status: 401 });
  }
  const { paperId } = await params;
  const job = await fetchJob(paperId);
  if (!job) {
    return NextResponse.json({ error: 'not_found', message: 'paper not found' }, { status: 404 });
  }
  if (!job.user_id || job.user_id !== session.userId) {
    return NextResponse.json({ error: 'forbidden', message: 'not allowed' }, { status: 403 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    updated_at: job.updated_at,
    progress_percent: job.progress_pct,
    message: job.status === 'completed' ? 'paper processed' : 'paper is being processed',
  });
}
