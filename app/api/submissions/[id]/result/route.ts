import { NextResponse, type NextRequest } from 'next/server';

import { fetchSubmission } from '../../../_lib/submissions';
import { getSession } from '../../../_lib/session';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const submission = await fetchSubmission(id);
  if (!submission) {
    return NextResponse.json({ error: 'not_found', message: 'submission not found' }, { status: 404 });
  }

  if (submission.user_id) {
    const session = getSession(request);
    if (!session?.userId) {
      return NextResponse.json({ error: 'unauthorized', message: 'login required' }, { status: 401 });
    }
    if (submission.user_id !== session.userId) {
      return NextResponse.json({ error: 'forbidden', message: 'not allowed' }, { status: 403 });
    }
  }

  if (submission.result_json) {
    if (typeof submission.result_json === 'string') {
      try {
        return NextResponse.json(JSON.parse(submission.result_json));
      } catch {
        return NextResponse.json({ raw: submission.result_json });
      }
    }
    return NextResponse.json(submission.result_json);
  }

  if (submission.result_blob_url) {
    return NextResponse.redirect(submission.result_blob_url);
  }

  if (submission.status !== 'completed') {
    return NextResponse.json(
      { error: 'not_ready', message: 'submission result not ready', status: submission.status },
      { status: 409 }
    );
  }

  return NextResponse.json({ error: 'missing_result', message: 'result missing' }, { status: 404 });
}
