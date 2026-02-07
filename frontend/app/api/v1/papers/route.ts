import { NextResponse, type NextRequest } from 'next/server';

import { createJobFromUpload } from '../../_lib/jobs';
import { getSession } from '../../_lib/session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session?.userId) {
    return NextResponse.json({ error: 'unauthorized', message: 'login required' }, { status: 401 });
  }
  let result: Awaited<ReturnType<typeof createJobFromUpload>>;
  try {
    result = await createJobFromUpload(request, { userId: session.userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to create job';
    return NextResponse.json({ error: 'server_error', message }, { status: 500 });
  }
  if ('error' in result) {
    return NextResponse.json({ error: result.error, message: result.message }, { status: 400 });
  }

  const { job } = result;
  return NextResponse.json(
    {
      id: job.id,
      status: job.status,
      message: 'paper accepted for processing',
      title: job.paper_title,
      filename: job.paper_filename,
      uploaded_at: job.created_at,
    },
    { status: 202 }
  );
}
