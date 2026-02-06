import { Client } from '@upstash/qstash';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '../../../_lib/env';
import { fetchJob, getBaseUrl, markJobQueued } from '../../../_lib/jobs';
import { processJob } from '../../../_lib/worker';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await markJobQueued(id);
  if (!job) {
    return NextResponse.json({ error: 'not_found', message: 'job not found or not queueable' }, { status: 404 });
  }

  if (env.qstashToken) {
    const client = new Client({ token: env.qstashToken, baseUrl: env.qstashUrl });
    const baseUrl = getBaseUrl(request);
    await client.publishJSON({
      url: `${baseUrl}/api/worker/run`,
      body: { job_id: job.id },
    });

    return NextResponse.json({
      id: job.id,
      status: 'queued',
      stage: job.stage,
      progress_pct: job.progress_pct,
      message: 'job queued for processing',
    });
  }

  const result = await processJob(job.id);
  const updated = await fetchJob(job.id);
  return NextResponse.json({
    id: job.id,
    status: updated?.status || job.status,
    stage: updated?.stage || job.stage,
    progress_pct: updated?.progress_pct ?? job.progress_pct,
    message: result.status === 'completed' ? 'job processed inline' : 'job queued locally',
    mode: 'inline',
  });
}
