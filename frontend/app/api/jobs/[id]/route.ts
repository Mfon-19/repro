import { NextResponse, type NextRequest } from 'next/server';

import { fetchJob } from '../../_lib/jobs';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const job = await fetchJob(params.id);
  if (!job) {
    return NextResponse.json({ error: 'not_found', message: 'job not found' }, { status: 404 });
  }

  let result = job.result_json as unknown;
  if (typeof result === 'string') {
    try {
      result = JSON.parse(result);
    } catch {
      result = job.result_json;
    }
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    stage: job.stage,
    progress_pct: job.progress_pct,
    paper: {
      title: job.paper_title,
      filename: job.paper_filename,
      blob_url: job.paper_blob_url,
    },
    result,
    result_blob_url: job.result_blob_url,
    error: job.error_message,
    updated_at: job.updated_at,
    created_at: job.created_at,
  });
}
