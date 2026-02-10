'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import Link from 'next/link';
import { zipSync, strToU8 } from 'fflate';

import IdePanel from '@/components/IdePanel';
import PdfViewerClient from '@/components/PdfViewerClient';
import type { CodeFile } from '@/components/CodeEditor';

const defaultFiles: CodeFile[] = [
  {
    path: 'package.json',
    language: 'json',
    value: `{\n  \"name\": \"repro-submission\",\n  \"private\": true,\n  \"type\": \"module\"\n}\n`,
  },
  {
    path: 'README.md',
    language: 'markdown',
    value: `# REPRODUCTION SCAFFOLD\n\nImplement the paper's core algorithm and data structures.\n`,
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
];

type JobResult = {
  title?: string;
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
  const [files, setFiles] = useState<CodeFile[]>(defaultFiles);
  const [runBusy, setRunBusy] = useState(false);
  const [submission, setSubmission] = useState<SubmissionStatus | null>(null);
  const appliedFilesRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const [splitPct, setSplitPct] = useState(44);
  const [isDragging, setIsDragging] = useState(false);

  const apiBase = useMemo(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    return base || '';
  }, []);

  useEffect(() => {
    if (!paperId) {
      return;
    }
    let cancelled = false;
    let shouldPoll = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    appliedFilesRef.current = false;

    const poll = async () => {
      if (!shouldPoll) {
        return;
      }
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

        if (data?.result?.files?.length && !appliedFilesRef.current) {
          setFiles(data.result.files);
          appliedFilesRef.current = true;
        }
        const isDone =
          data.status === 'completed' ||
          data.status === 'failed' ||
          (data.result && data.progress_pct >= 100);

        if (isDone) {
          shouldPoll = false;
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
      shouldPoll = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [apiBase, paperId]);

  const title = job?.paper?.title || job?.result?.title || `PAPER ${paperId}`;
  const pdfUrl = job?.paper?.paper_url || '';

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const next = ((event.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(75, Math.max(25, next));
      setSplitPct(clamped);
    };

    const handleUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const handleDividerDown = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    draggingRef.current = true;
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
          </div>
          <Link href="/home" className="btn-outline text-xs px-4 py-2">
            HOME
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-xs">
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
        <div
          ref={containerRef}
          className="relative grid grid-cols-1 gap-6 xl:gap-0 xl:[grid-template-columns:var(--split-cols)]"
          style={
            {
              '--split-cols': `minmax(280px, ${splitPct}%) 10px minmax(320px, ${100 - splitPct}%)`,
            } as CSSProperties
          }
        >
          <section className="border border-[var(--border)] bg-black/40 p-5">
            <div className="mb-6">
              <PdfViewerClient fileUrl={pdfUrl} height={520} />
            </div>
          </section>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panels"
            onMouseDown={handleDividerDown}
            className={[
              'hidden xl:flex items-center justify-center cursor-col-resize',
              'bg-[var(--border)]/50 hover:bg-[var(--accent)]/50 transition-colors',
              isDragging ? 'bg-[var(--accent)]/60' : '',
            ].join(' ')}
          >
            <div className="h-16 w-[2px] bg-[var(--border)]/80" />
          </div>

          <section className="border border-[var(--border)] bg-black/30 p-5">
            <div className="mb-4" />

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
