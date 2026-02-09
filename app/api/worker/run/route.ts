import { Receiver } from '@upstash/qstash';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '../../_lib/env';
import { processJob } from '../../_lib/worker';

export const runtime = 'nodejs';

async function verifySignature(request: NextRequest, rawBody: string) {
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

  let body: { job_id?: string; jobId?: string } = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const jobId = body.job_id || body.jobId;
  if (!jobId) {
    return NextResponse.json({ error: 'missing_job_id' }, { status: 400 });
  }

  const result = await processJob(jobId);
  return NextResponse.json(result);
}
