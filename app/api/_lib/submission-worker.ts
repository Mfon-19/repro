import { put } from '@vercel/blob';

import { claimSubmission, completeSubmission, failSubmission, fetchSubmission, updateSubmissionStage } from './submissions';
import { createExecutionSandbox } from './sandbox';

export type SubmissionProcessResult =
  | { status: 'skipped'; reason: string }
  | { status: 'completed'; submissionId: string }
  | { status: 'failed'; submissionId: string; error: string };

function resolveRunCommand(language: string) {
  if (language === 'go') {
    return {
      cmd: 'bash',
      args: ['-lc', 'cd /vercel/sandbox/workspace && go test ./...'],
    };
  }

  return {
    cmd: 'bash',
    args: [
      '-lc',
      'cd /vercel/sandbox/workspace && if [ -f package.json ]; then npm install --silent && npx --yes tsx --test; else printf "No tests configured\\n"; fi',
    ],
  };
}

export async function processSubmission(submissionId: string): Promise<SubmissionProcessResult> {
  const submission = await fetchSubmission(submissionId);
  if (!submission) {
    return { status: 'skipped', reason: 'submission_not_found' };
  }

  const claimed = await claimSubmission(submissionId);
  if (!claimed) {
    return { status: 'skipped', reason: 'not_runnable' };
  }

  const startTime = Date.now();
  const sandbox = await createExecutionSandbox(claimed.language);

  try {
    await updateSubmissionStage(submissionId, 'download', 25);
    if (!claimed.submission_blob_url) {
      throw new Error('submission blob missing');
    }

    const response = await fetch(claimed.submission_blob_url);
    if (!response.ok) {
      throw new Error(`failed to fetch submission blob (${response.status})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await sandbox.writeFiles([
      { path: 'submission.zip', content: buffer },
    ]);

    await sandbox.mkDir('/vercel/sandbox/workspace');

    await updateSubmissionStage(submissionId, 'unpack', 40);
    await sandbox.runCommand({
      cmd: 'unzip',
      args: ['-o', 'submission.zip', '-d', 'workspace'],
      cwd: '/vercel/sandbox',
    });

    await updateSubmissionStage(submissionId, 'execute', 70);
    const runCommand = resolveRunCommand(claimed.language);
    const result = await sandbox.runCommand({
      cmd: runCommand.cmd,
      args: runCommand.args,
    });

    const stdout = await result.stdout();
    const stderr = await result.stderr();
    const exitCode = result.exitCode;
    const durationMs = Date.now() - startTime;

    const resultJson = {
      exitCode,
      durationMs,
      command: [runCommand.cmd, ...(runCommand.args || [])].join(' '),
      stdout,
      stderr,
    };

    const resultBlob = await put(`submissions/${submissionId}/result.json`, JSON.stringify(resultJson, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    if (exitCode === 0) {
      await completeSubmission({
        id: submissionId,
        resultJson,
        resultBlobUrl: resultBlob.url,
        exitCode,
        durationMs,
      });
      return { status: 'completed', submissionId };
    }

    await failSubmission({
      id: submissionId,
      errorCode: 'tests_failed',
      message: 'tests failed',
      resultJson,
      resultBlobUrl: resultBlob.url,
      exitCode,
      durationMs,
    });

    return { status: 'failed', submissionId, error: 'tests failed' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    await failSubmission({
      id: submissionId,
      errorCode: 'execution_failed',
      message,
    });
    return { status: 'failed', submissionId, error: message };
  } finally {
    try {
      await sandbox.stop();
    } catch {
      // ignore sandbox cleanup errors
    }
  }
}
