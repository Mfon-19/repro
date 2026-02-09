import { put } from '@vercel/blob';

import { sql } from './db';
import { env } from './env';
import { claimJob, completeJob, failJob, updateGeminiFile } from './jobs';
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

type GeminiFile = {
  uri: string;
  mimeType: string;
};

function buildScaffold(title: string | null, jobId: string): ScaffoldResult {
  const safeTitle = title || 'Untitled Paper';
  return {
    jobId,
    title: safeTitle,
    tasks: ['IMPLEMENT CORE ALGORITHM', 'DEFINE DATA STRUCTURES', 'ADD TEST HARNESS'],
    files: [
      {
        path: 'package.json',
        language: 'json',
        value: `{
  "name": "repro-submission",
  "private": true,
  "type": "module"
}
`,
      },
      {
        path: 'README.md',
        language: 'markdown',
        value: `# ${safeTitle}\n\nImplement the paper's core algorithm and data structures.\n\n## Notes\n- Fill in TODOs in src/solution.ts\n- Update tests with expected behaviors once the algorithm is implemented\n`,
      },
      {
        path: 'src/solution.ts',
        language: 'typescript',
        value: `// Core solution entrypoint.\n\nexport function solve(input: string): string {\n  // TODO: parse input, implement the algorithm, and return output.\n  return '';\n}\n`,
      },
      {
        path: 'tests/solution.test.ts',
        language: 'typescript',
        value: `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { solve } from '../src/solution';\n\ntest('placeholder behavior', () => {\n  // TODO: replace with real examples once you implement the algorithm.\n  assert.equal(solve('input'), 'output');\n});\n`,
      },
    ],
  };
}

async function uploadPdfToGemini(
  apiKey: string,
  buffer: Buffer,
  filename: string
): Promise<GeminiFile | null> {
  const mimeType = 'application/pdf';
  const uploadInit = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': buffer.length.toString(),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: {
          display_name: filename || 'paper.pdf',
        },
      }),
    }
  );

  if (!uploadInit.ok) {
    let detail = '';
    try {
      detail = await uploadInit.text();
    } catch {
      detail = '';
    }
    console.warn('Gemini file upload init failed', uploadInit.status, detail);
    return null;
  }

  const uploadUrl = uploadInit.headers.get('x-goog-upload-url')?.trim();
  if (!uploadUrl) {
    console.warn('Gemini file upload init missing upload url');
    return null;
  }

  const uploadResp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': buffer.length.toString(),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Type': mimeType,
    },
    body: new Uint8Array(buffer),
  });

  if (!uploadResp.ok) {
    let detail = '';
    try {
      detail = await uploadResp.text();
    } catch {
      detail = '';
    }
    console.warn('Gemini file upload failed', uploadResp.status, detail);
    return null;
  }

  const data = (await uploadResp.json()) as { file?: { uri?: string; mimeType?: string } };
  if (!data.file?.uri) {
    return null;
  }

  return {
    uri: data.file.uri,
    mimeType: data.file.mimeType || mimeType,
  };
}

async function generateScaffoldWithLlm(
  title: string | null,
  jobId: string,
  pdfFile?: GeminiFile | null
): Promise<ScaffoldResult> {
  const apiKey = env.geminiApiKey;
  if (!apiKey) {
    return buildScaffold(title, jobId);
  }

  const model = env.geminiModel || 'gemini-3-flash-preview';
  const safeTitle = title || 'Untitled Paper';
  const debugEnabled = env.geminiDebug === '1' || process.env.NODE_ENV !== 'production';

  const prompt = `You are an expert algorithm instructor and researcher.
Your task is to analyze the provided research paper (PDF or text) and distill the core algorithmic contribution into a "LeetCode-style" programming challenge.

Focus on the main algorithm, data structure, or logic proposed in the paper.
Simplify the context so it fits a single-file implementation task.
Return the result strictly as a JSON object matching the requested schema.
"Extract the main algorithm from this paper and create a coding problem."

Your output will be used as the student's starter code stub.

Return ONLY strict JSON with this shape:
{
  "tasks": ["TASK 1", "TASK 2"],
  "files": [
    { "path": "package.json", "language": "json", "value": "..." },
    { "path": "README.md", "language": "markdown", "value": "..." },
    { "path": "src/solution.ts", "language": "typescript", "value": "..." },
    { "path": "tests/solution.test.ts", "language": "typescript", "value": "..." }
  ]
}
Constraints:
- Output MUST be valid JSON with double quotes and no trailing commas.
- Do NOT wrap in markdown or code fences.
- You may return any number of tasks (up to 5).
- You may return any number of files.
- Every function you create MUST include a TODO comment describing the high-level implementation goal.
- Include comprehensive tests that use Node's built-in node:test and assert/strict.
- The scaffold should ask the user to implement the paper's algorithm(s).
Use the PDF content to infer the algorithm, data structures, and expected behaviors.
Design guidance:
- Prefer small, well-named functions with clear responsibilities.
- Include type definitions and interfaces for core data structures.
- Add TODOs for tricky sections: invariants, concurrency, failure modes, performance.
- In tests, cover happy path, edge cases, and at least one adversarial scenario.
Output must be executable in Node 22 with TypeScript via tsx.
Context title: "${safeTitle}"
`;

  try {
    const parts: Array<{ text?: string; file_data?: { mime_type: string; file_uri: string } }> = [
      { text: prompt },
    ];
    if (pdfFile) {
      parts.push({
        file_data: {
          mime_type: pdfFile.mimeType,
          file_uri: pdfFile.uri,
        },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts,
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1500,
          },
        }),
      }
    );

    if (!response.ok) {
      if (debugEnabled) {
        let detail = '';
        try {
          detail = await response.text();
        } catch {
          detail = '';
        }
        console.warn('Gemini generateContent failed', response.status, detail);
      }
      return buildScaffold(title, jobId);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      if (debugEnabled) {
        console.warn('Gemini returned empty content', data);
      }
      return buildScaffold(title, jobId);
    }

    let parsed: Partial<ScaffoldResult> | null = null;
    try {
      parsed = JSON.parse(text) as Partial<ScaffoldResult>;
    } catch (error) {
      if (debugEnabled) {
        console.warn('Gemini JSON parse failed', error, text);
      }
      return buildScaffold(title, jobId);
    }
    const base = buildScaffold(title, jobId);

    const tasks = Array.isArray(parsed.tasks)
      ? parsed.tasks
          .filter((task) => typeof task === 'string' && task.trim().length > 0)
          .slice(0, 5)
      : base.tasks;

    const files = Array.isArray(parsed.files)
      ? parsed.files
          .filter((file) => file && typeof file.path === 'string' && typeof file.value === 'string')
          .map((file) => ({
            path: file.path,
            language: typeof file.language === 'string' ? file.language : 'text',
            value: file.value,
          }))
      : base.files;

    if (!tasks.length || !files.length) {
      if (debugEnabled) {
        console.warn('Gemini returned empty tasks or files', { tasks, filesCount: files.length });
      }
      return base;
    }

    return {
      jobId,
      title: base.title,
      tasks,
      files,
    };
  } catch {
    return buildScaffold(title, jobId);
  }
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

    let cachedFile: GeminiFile | null = null;
    if (job.gemini_file_uri && job.gemini_file_mime && job.gemini_file_created_at) {
      const createdAt = new Date(job.gemini_file_created_at).getTime();
      const maxAgeMs = 46 * 60 * 60 * 1000;
      if (!Number.isNaN(createdAt) && createdAt > Date.now() - maxAgeMs) {
        cachedFile = {
          uri: job.gemini_file_uri,
          mimeType: job.gemini_file_mime,
        };
      }
    }

    let geminiFile = cachedFile;
    if (!geminiFile && env.geminiApiKey) {
      const uploaded = await uploadPdfToGemini(
        env.geminiApiKey,
        buffer,
        job.paper_filename || 'paper.pdf'
      );
      if (uploaded) {
        geminiFile = uploaded;
        await updateGeminiFile(jobId, uploaded);
      }
    }

    const resultJson = await generateScaffoldWithLlm(resolvedTitle, jobId, geminiFile);

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
