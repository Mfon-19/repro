import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: { paperId: string } }) {
  // TODO: fetch challenge specs generated for this paper from storage.
  return NextResponse.json({
    paper_id: params.paperId,
    status: 'pending',
    message: 'challenge specs are not generated yet',
  });
}
