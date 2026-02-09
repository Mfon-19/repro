import { put } from '@vercel/blob';

import { sql } from './db';
import { claimJob, completeJob, failJob } from './jobs';
import { extractPdfTitle } from './pdf';

export type ProcessResult =
  | { status: 'skipped'; reason: string }
  | { status: 'completed'; jobId: string }
  | { status: 'failed'; jobId: string; error: string };

type ScaffoldResult = {
  jobId: string;
  title: string;
  tasks: string[];
  files: { path: string; language: string; value: string }[];
};

function buildScaffold(title: string | null, jobId: string): ScaffoldResult {
  const safeTitle = title || 'Untitled Paper';
  return {
    jobId,
    title: safeTitle,
    tasks: ['IMPLEMENT CORE ALGORITHM', 'ADD TEST HARNESS', 'WRITE PERFORMANCE NOTES'],
    files: [
      {
        path: 'README.md',
        language: 'markdown',
        value: `# ${safeTitle}\n\nGenerated scaffold for reproduction.\n`,
      },
      {
        path: 'src/index.ts',
        language: 'typescript',
        value: `// ${safeTitle} reproduction scaffold\n\nexport function run() {\n  // TODO: implement core logic\n  return 'todo';\n}\n`,
      },
      {
        path: 'tests/spec.test.ts',
        language: 'typescript',
        value: `import { run } from '../src/index';\n\ndescribe('repro', () => {\n  it('returns placeholder', () => {\n    expect(run()).toBe('todo');\n  });\n});\n`,
      },
    ],
  };
}

async function generateScaffoldWithLlm(title: string | null, jobId: string): Promise<ScaffoldResult> {
  // TODO: Replace this mock with a real LLM call.
  // - Send the extracted title + (optional) PDF text to your model provider.
  // - Parse the response into { tasks, files } and return that structure.
  // - Consider adding retries + a fallback scaffold.
  return buildScaffold(title, jobId);
}

async function updateProgress(jobId: string, stage: string, progress: number) {
  await sql`
    update jobs
    set stage = ${stage},
        progress_pct = greatest(progress_pct, ${progress}),
        updated_at = now()
    where id = ${jobId}
  `;
}

export async function processJob(jobId: string): Promise<ProcessResult> {
  const job = await claimJob(jobId);
  if (!job) {
    return { status: 'skipped', reason: 'job_not_runnable' };
  }

  try {
    if (!job.paper_blob_url) {
      await failJob(jobId, 'missing_blob', 'paper blob url missing');
      return { status: 'failed', jobId, error: 'paper blob url missing' };
    }

    await updateProgress(jobId, 'extracting', 45);
    const response = await fetch(job.paper_blob_url);
    if (!response.ok) {
      throw new Error(`failed to fetch blob (${response.status})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const extractedTitle = await extractPdfTitle(buffer);
    const resolvedTitle = extractedTitle || job.paper_title || null;

    await updateProgress(jobId, 'generating_scaffold', 75);
    const resultJson = await generateScaffoldWithLlm(resolvedTitle, jobId);

    const resultBlob = await put(`results/${jobId}/scaffold.json`, JSON.stringify(resultJson, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    await updateProgress(jobId, 'finalizing', 90);

    await completeJob(jobId, {
      resultJson,
      resultBlobUrl: resultBlob.url,
      title: resolvedTitle,
    });

    return { status: 'completed', jobId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    await failJob(jobId, 'processing_failed', message);
    return { status: 'failed', jobId, error: message };
  }
}
