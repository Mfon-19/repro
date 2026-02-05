import { NextResponse, type NextRequest } from 'next/server';

import { fetchJob } from '../../../_lib/jobs';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: { paperId: string } }) {
  const job = await fetchJob(params.paperId);
  if (!job) {
    return NextResponse.json({ error: 'not_found', message: 'paper not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    updated_at: job.updated_at,
    progress_percent: job.progress_pct,
    message: job.status === 'completed' ? 'paper processed' : 'paper is being processed',
  });
}
