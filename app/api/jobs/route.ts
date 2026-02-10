import { NextResponse, type NextRequest } from 'next/server';

import { createJobFromUpload } from '../_lib/jobs';
import { getSession } from '../_lib/session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = getSession(request);
  let result: Awaited<ReturnType<typeof createJobFromUpload>>;
  try {
    result = await createJobFromUpload(request, { userId: session?.userId || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to create job';
    return NextResponse.json({ error: 'server_error', message }, { status: 500 });
  }

  if ('error' in result) {
    return NextResponse.json({ error: result.error, message: result.message }, { status: 400 });
  }

  const { job, blob } = result;
  return NextResponse.json(
    {
      id: job.id,
      status: job.status,
      stage: job.stage,
      progress_pct: job.progress_pct,
      paper: {
        filename: job.paper_filename,
        title: job.paper_title,
        bytes: blob.size,
      },
      message: 'job created; call finalize to queue processing',
    },
    { status: 202 }
  );
}
