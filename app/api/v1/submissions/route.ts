import { type NextRequest } from 'next/server';

import { handleSubmissionUpload } from '../../_lib/submission-handler';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleSubmissionUpload(request);
}
