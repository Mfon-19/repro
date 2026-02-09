import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const { submissionId } = await params;
  // TODO: upgrade to WebSocket once a real console stream is implemented.
  return NextResponse.json(
    {
      submission_id: submissionId,
      message: 'websocket console not implemented',
    },
    { status: 426 }
  );
}
