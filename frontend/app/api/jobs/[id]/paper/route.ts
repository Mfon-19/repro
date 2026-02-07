import { NextResponse, type NextRequest } from 'next/server';

import { fetchJob } from '../../../_lib/jobs';
import { getSession } from '../../../_lib/session';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await fetchJob(id);
  if (!job) {
    return NextResponse.json({ error: 'not_found', message: 'job not found' }, { status: 404 });
  }

  const session = getSession(request);
  if (!session?.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!job.user_id || job.user_id !== session.userId) {
    return NextResponse.json({ error: 'forbidden', message: 'not allowed' }, { status: 403 });
  }

  if (!job.paper_blob_url) {
    return NextResponse.json({ error: 'missing_blob', message: 'paper blob not found' }, { status: 404 });
  }

  const blobResponse = await fetch(job.paper_blob_url);
  if (!blobResponse.ok || !blobResponse.body) {
    return NextResponse.json({ error: 'blob_unavailable', message: 'paper not available' }, { status: 502 });
  }

  const headers = new Headers(blobResponse.headers);
  headers.set('Content-Type', headers.get('Content-Type') || 'application/pdf');
  headers.set('Cache-Control', 'private, max-age=60');

  return new NextResponse(blobResponse.body, { status: 200, headers });
}
