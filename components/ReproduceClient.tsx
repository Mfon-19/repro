'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { zipSync, strToU8 } from 'fflate';

import IdePanel from '@/components/IdePanel';
import PdfViewerClient from '@/components/PdfViewerClient';
import type { CodeFile } from '@/components/CodeEditor';

const defaultTasks = [
  'IMPLEMENT APPEND_ENTRIES RPC',
  'ENFORCE TERM AND COMMIT RULES',
  'SIMULATE NETWORK PARTITIONS',
];

const defaultFiles: CodeFile[] = [
  {
    path: 'README.md',
    language: 'markdown',
    value: `# RAFT REPRODUCTION\n\nImplement log replication using the shared scaffold.\n`,
  },
  {
    path: 'src/raft.ts',
    language: 'typescript',
    value: `type LogEntry = {\n  term: number;\n  index: number;\n  data: Uint8Array;\n};\n\ntype AppendRequest = {\n  term: number;\n  leaderId: string;\n  entries: LogEntry[];\n  leaderCommit: number;\n};\n\ntype AppendResponse = {\n  success: boolean;\n  term: number;\n};\n\n// AppendEntries handles leader replication requests.\nexport function appendEntries(req: AppendRequest): AppendResponse {\n  // TODO: validate term and log consistency\n  // TODO: append new entries and update commit index\n  return { success: false, term: req.term };\n}\n`,
  },
  {
    path: 'tests/raft_spec.test.ts',
    language: 'typescript',
    value: `import { appendEntries } from '../src/raft';\n\ndescribe('appendEntries', () => {\n  it('rejects empty entries for now', () => {\n    const result = appendEntries({ term: 1, leaderId: 'n1', entries: [], leaderCommit: 0 });\n    expect(result.success).toBe(false);\n  });\n});\n`,
  },
];

type JobResult = {
  title?: string;
  tasks?: string[];
  files?: { path: string; language: string; value: string }[];
};

type JobStatus = {
  id: string;
  status: string;
  stage: string;
  progress_pct: number;
  paper?: { title?: string | null; paper_url?: string };
  result?: JobResult | null;
  error?: string | null;
};

type SubmissionStatus = {
  id: string;
  status: string;
  stage: string;
  progress_pct: number;
  result?: { stdout?: string; stderr?: string; exitCode?: number } | null;
  error?: string | null;
};

type ReproduceClientProps = {
  paperId: string;
};

export default function ReproduceClient({ paperId }: ReproduceClientProps) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [error, setError] = useState('');
  const [tasks, setTasks] = useState(defaultTasks);
  const [files, setFiles] = useState<CodeFile[]>(defaultFiles);
  const [runBusy, setRunBusy] = useState(false);
  const [submission, setSubmission] = useState<SubmissionStatus | null>(null);

  const apiBase = useMemo(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    return base || '';
  }, []);

  useEffect(() => {
    if (!paperId) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const response = await fetch(`${apiBase}/api/jobs/${paperId}`, { credentials: 'include' });
        if (!response.ok) {
          throw new Error('Failed to load job');
        }
        const data = (await response.json()) as JobStatus;
        if (cancelled) {
          return;
        }
        setJob(data);
        setError('');

        if (data?.result?.tasks?.length) {
          setTasks(data.result.tasks);
        }
        if (data?.result?.files?.length) {
          setFiles(data.result.files);
        }
        if (data.status === 'completed' || data.status === 'failed') {
          return;
        }

        timer = setTimeout(poll, 4000);
      } catch {
        if (!cancelled) {
          setError('FAILED TO LOAD JOB STATUS.');
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [apiBase, paperId]);

  const title = job?.paper?.title || job?.result?.title || `PAPER ${paperId}`;
  const statusLabel = job ? `${job.status.toUpperCase()} · ${job.stage.toUpperCase()}` : 'LOADING';
  const progressLabel = job ? `${job.progress_pct}%` : '--';
  const pdfUrl = job?.paper?.paper_url || '';

  const handleRunTests = useCallback(async () => {
    if (runBusy) {
      return;
    }
    setRunBusy(true);
    setError('');

    try {
      const zipPayload: Record<string, Uint8Array> = {};
      files.forEach((file) => {
        zipPayload[file.path] = strToU8(file.value);
      });
      const zipped = zipSync(zipPayload, { level: 6 });
      const zipBytes = new Uint8Array(zipped);
      const blob = new Blob([zipBytes], { type: 'application/zip' });
      const file = new File([blob], `submission-${paperId}.zip`, { type: 'application/zip' });

      const formData = new FormData();
      formData.append('submission', file);
      formData.append('job_id', paperId);
      formData.append('language', 'typescript');

      const response = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.message || 'FAILED TO SUBMIT.');
        return;
      }

      setSubmission({
        id: data.id,
        status: data.status,
        stage: data.stage,
        progress_pct: data.progress_pct,
      });
    } catch {
      setError('FAILED TO PACKAGE SUBMISSION.');
    } finally {
      setRunBusy(false);
    }
  }, [files, paperId, runBusy]);

  const runDisabled =
    runBusy || submission?.status === 'queued' || submission?.status === 'running';

  useEffect(() => {
    if (!submission?.id) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const response = await fetch(`/api/submissions/${submission.id}`, { credentials: 'include' });
        if (!response.ok) {
          throw new Error('Failed to load submission');
        }
        const data = (await response.json()) as SubmissionStatus;
        if (cancelled) {
          return;
        }
        setSubmission((prev) => (prev ? { ...prev, ...data } : data));

        if (data.status === 'completed' || data.status === 'failed') {
          const resultResponse = await fetch(`/api/submissions/${submission.id}/result`, { credentials: 'include' });
          if (resultResponse.ok) {
            const resultData = await resultResponse.json();
            setSubmission((prev) => {
              if (!prev) {
                return prev;
              }
              return {
                ...prev,
                result: resultData,
                error: data.error || resultData?.error || null,
              };
            });
          }
          return;
        }

        timer = setTimeout(poll, 4000);
      } catch {
        if (!cancelled) {
          setError('FAILED TO LOAD RUN STATUS.');
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [submission?.id]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="border-b border-[var(--border)] px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="text-xs text-[#666] mb-2">REPRODUCE</div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="border border-[var(--border)] px-3 py-1">STATUS: {statusLabel}</span>
            <span className="border border-[var(--border)] px-3 py-1">PROGRESS: {progressLabel}</span>
            <button className="btn-outline text-xs px-4 py-2">REQUEST_REVIEW</button>
            <button
              className="btn-solid text-xs px-4 py-2"
              onClick={handleRunTests}
              disabled={runDisabled}
            >
              {runDisabled ? 'RUNNING...' : 'RUN_TESTS'}
            </button>
          </div>
        </div>
        {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
        {job?.status === 'failed' && (
          <div className="mt-2 text-xs text-red-400">JOB FAILED: {job.error || 'UNKNOWN ERROR'}</div>
        )}
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.4fr] gap-6">
          <section className="border border-[var(--border)] bg-black/40 p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">PAPER_VIEW</h2>
              <span className="text-xs text-[#666]">READ_ONLY</span>
            </div>
            <div className="mb-6">
              <PdfViewerClient fileUrl={pdfUrl} height={520} />
            </div>

            <div className="mt-6 border border-[var(--border)] p-4">
              <div className="text-xs text-[var(--accent)] mb-3">TASKS</div>
              <ul className="space-y-2 text-xs text-[#666]">
                {tasks.map((task) => (
                  <li key={task} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="border border-[var(--border)] bg-black/30 p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold">IMPLEMENTATION_IDE</h2>
              <div className="flex items-center gap-3 text-xs text-[#666]">
                <span>BRANCH: MAIN</span>
                <span>RUNS: 02</span>
              </div>
            </div>

            <IdePanel files={files} height={520} onFilesChange={setFiles} />

            <div className="mt-5 border border-[var(--border)] bg-black/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-[var(--accent)]">CONSOLE</div>
                <button className="btn-solid text-[10px] px-3 py-2" onClick={handleRunTests} disabled={runDisabled}>
                  {runDisabled ? 'RUNNING...' : 'RUN_TESTS'}
                </button>
              </div>
              <div className="text-[10px] text-[#666] space-y-2">
                {submission ? (
                  <>
                    <div>STATUS: {submission.status?.toUpperCase()}</div>
                    <div>STAGE: {submission.stage?.toUpperCase()}</div>
                    <div>PROGRESS: {submission.progress_pct ?? 0}%</div>
                    {submission.error && <div className="text-red-400">ERROR: {submission.error}</div>}
                    {submission.result?.stdout && (
                      <pre className="whitespace-pre-wrap text-[10px] text-[#8bd450]">{submission.result.stdout}</pre>
                    )}
                    {submission.result?.stderr && (
                      <pre className="whitespace-pre-wrap text-[10px] text-red-400">{submission.result.stderr}</pre>
                    )}
                  </>
                ) : (
                  <div>NO RUNS YET.</div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
