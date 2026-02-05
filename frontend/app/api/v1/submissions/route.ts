import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const submission = formData.get('submission');

  if (!submission || !(submission instanceof File)) {
    return NextResponse.json({ error: 'missing_submission', message: 'submission zip is required' }, { status: 400 });
  }

  // TODO: persist submission artifact and enqueue grading pipeline.
  return NextResponse.json({
    id: `submission_${Date.now()}`,
    status: 'received',
    message: 'submission accepted for grading',
  }, { status: 202 });
}
