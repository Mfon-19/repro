import { NextResponse, type NextRequest } from 'next/server';

import { fetchJob } from '../../../_lib/jobs';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await fetchJob(id);
  if (!job) {
    return NextResponse.json({ error: 'not_found', message: 'job not found' }, { status: 404 });
  }

  if (job.status !== 'completed') {
    return NextResponse.json(
      { error: 'not_ready', message: 'job result not ready', status: job.status },
      { status: 409 }
    );
  }

  if (job.result_json) {
    if (typeof job.result_json === 'string') {
      try {
        return NextResponse.json(JSON.parse(job.result_json));
      } catch {
        return NextResponse.json(job.result_json);
      }
    }
    return NextResponse.json(job.result_json);
  }

  if (job.result_blob_url) {
    return NextResponse.redirect(job.result_blob_url);
  }

  return NextResponse.json({ error: 'missing_result', message: 'job result missing' }, { status: 404 });
}
