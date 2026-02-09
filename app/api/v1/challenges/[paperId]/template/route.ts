import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  const { paperId } = await params;
  // TODO: trigger AI scaffold generation for this paper.
  return NextResponse.json({
    paper_id: paperId,
    status: 'queued',
    message: 'template generation queued',
  }, { status: 202 });
}
