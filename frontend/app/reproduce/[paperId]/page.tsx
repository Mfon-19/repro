import IdePanel from '@/components/IdePanel';
import PdfViewer from '@/components/PdfViewer';

type ReproducePageProps = {
  params: {
    paperId: string;
  };
};

const tasks = [
  'IMPLEMENT APPEND_ENTRIES RPC',
  'ENFORCE TERM AND COMMIT RULES',
  'SIMULATE NETWORK PARTITIONS',
];

const files = [
  {
    path: 'README.md',
    language: 'markdown',
    value: `# RAFT REPRODUCTION

Implement log replication using the shared scaffold.
`,
  },
  {
    path: 'src/raft.ts',
    language: 'typescript',
    value: `type LogEntry = {
  term: number;
  index: number;
  data: Uint8Array;
};

type AppendRequest = {
  term: number;
  leaderId: string;
  entries: LogEntry[];
  leaderCommit: number;
};

type AppendResponse = {
  success: boolean;
  term: number;
};

// AppendEntries handles leader replication requests.
export function appendEntries(req: AppendRequest): AppendResponse {
  // TODO: validate term and log consistency
  // TODO: append new entries and update commit index
  return { success: false, term: req.term };
}`,
  },
  {
    path: 'tests/raft_spec.test.ts',
    language: 'typescript',
    value: `import { appendEntries } from '../src/raft';

describe('appendEntries', () => {
  it('rejects empty entries for now', () => {
    const result = appendEntries({ term: 1, leaderId: 'n1', entries: [], leaderCommit: 0 });
    expect(result.success).toBe(false);
  });
});
`,
  },
];

export default function ReproducePage({ params }: ReproducePageProps) {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="border-b border-[var(--border)] px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="text-xs text-[#666] mb-2">REPRODUCE</div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">PAPER {params.paperId}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="border border-[var(--border)] px-3 py-1">STATUS: SPEC_READY</span>
            <span className="border border-[var(--border)] px-3 py-1">SCaffold: V1</span>
            <button className="btn-outline text-xs px-4 py-2">REQUEST_REVIEW</button>
            <button className="btn-solid text-xs px-4 py-2">RUN_TESTS</button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.4fr] gap-6">
          <section className="border border-[var(--border)] bg-black/40 p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">PAPER_VIEW</h2>
              <span className="text-xs text-[#666]">READ_ONLY</span>
            </div>
            <div className="mb-6">
              <PdfViewer fileUrl="/sample-paper.pdf" height={520} />
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
