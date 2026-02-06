'use client';

import { useEffect, useMemo, useState } from 'react';

import IdePanel from '@/components/IdePanel';
import PdfViewerClient from '@/components/PdfViewerClient';

const defaultTasks = [
  'IMPLEMENT APPEND_ENTRIES RPC',
  'ENFORCE TERM AND COMMIT RULES',
  'SIMULATE NETWORK PARTITIONS',
];

const defaultFiles = [
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

type ReproduceClientProps = {
  paperId: string;
};

export default function ReproduceClient({ paperId }: ReproduceClientProps) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [error, setError] = useState('');
  const [tasks, setTasks] = useState(defaultTasks);
  const [files, setFiles] = useState(defaultFiles);

  const apiBase = useMemo(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    return base || '';
  }, []);

  useEffect(() => {
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
  const pdfUrl = job?.paper?.paper_url
    ? `${apiBase}${job.paper.paper_url}`
    : '';

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
            <button className="btn-solid text-xs px-4 py-2">RUN_TESTS</button>
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

            <IdePanel files={files} height={520} />

            <div className="mt-5 border border-[var(--border)] bg-black/60 p-4">
              <div className="text-xs text-[var(--accent)] mb-2">CONSOLE</div>
              <div className="text-xs text-[#666] space-y-1">
                <div>[RUN_02] SPEC CHECKS PASSED: 12/18</div>
                <div>[RUN_02] FAILED: LOG_MATCHING@TERM_4</div>
                <div>[RUN_02] TRACE: FOLLOWER_3 OUT OF SYNC</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
