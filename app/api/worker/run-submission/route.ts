import { Receiver } from '@upstash/qstash';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '../../_lib/env';
import { processSubmission } from '../../_lib/submission-worker';

export const runtime = 'nodejs';

async function verifySignature(request: NextRequest, rawBody: string) {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  if (!env.qstashCurrentSigningKey || !env.qstashNextSigningKey) {
    return true;
  }

  const signature = request.headers.get('upstash-signature');
  if (!signature) {
    return false;
  }

  const receiver = new Receiver({
    currentSigningKey: env.qstashCurrentSigningKey,
    nextSigningKey: env.qstashNextSigningKey,
  });

  return receiver.verify({
    signature,
    body: rawBody,
    url: request.url,
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const verified = await verifySignature(request, rawBody);
  if (!verified) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let body: { submission_id?: string; submissionId?: string } = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const submissionId = body.submission_id || body.submissionId;
  if (!submissionId) {
    return NextResponse.json({ error: 'missing_submission_id' }, { status: 400 });
  }

  const result = await processSubmission(submissionId);
  return NextResponse.json(result);
}
