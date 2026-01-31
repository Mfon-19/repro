import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('@/components/PdfViewer'), { ssr: false });

type ReproducePageProps = {
  params: {
    paperId: string;
  };
};

const paperSections = [
  {
    title: 'ABSTRACT',
    body: 'WE FORMALIZE THE INVARIANTS AND FAILURE MODES, THEN REPRODUCE THE CORE ALGORITHM UNDER CONTROLLED FAULT INJECTION.',
  },
  {
    title: 'GOALS',
    body: 'IMPLEMENT LOG REPLICATION. PROVE SAFETY IN THE PRESENCE OF PARTITIONS. VERIFY PERFORMANCE UNDER LOAD.',
  },
  {
    title: 'KEY_INVARIANTS',
    body: 'ELECTION SAFETY, LOG MATCHING, LEADER COMPLETENESS, STATE MACHINE SAFETY.',
  },
];

const tasks = [
  'IMPLEMENT APPEND_ENTRIES RPC',
  'ENFORCE TERM AND COMMIT RULES',
  'SIMULATE NETWORK PARTITIONS',
];

const files = ['README.md', 'src/raft.go', 'tests/raft_spec_test.go'];

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

            <div className="space-y-5">
              {paperSections.map((section) => (
                <div key={section.title} className="border border-[var(--border)] p-4">
                  <div className="text-xs text-[var(--accent)] mb-2">{section.title}</div>
                  <p className="text-sm text-[#777] leading-relaxed">{section.body}</p>
                </div>
              ))}
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

            <div className="flex flex-wrap gap-2 mb-4 text-xs">
              {files.map((file) => (
                <div key={file} className="border border-[var(--border)] px-3 py-1 bg-black/50">
                  {file}
                </div>
              ))}
            </div>

            <div className="border border-[var(--border)] bg-black/70">
              <div className="border-b border-[var(--border)] px-4 py-2 text-xs text-[#666]">
                src/raft.go
              </div>
              <pre className="p-4 text-xs leading-6 overflow-x-auto">
{`package raft

type LogEntry struct {
  Term  int
  Index int
  Data  []byte
}

// AppendEntries handles leader replication requests.
func (r *Raft) AppendEntries(req AppendRequest) AppendResponse {
  // TODO: validate term and log consistency
  // TODO: append new entries and update commit index
  return AppendResponse{Success: false}
}`}
              </pre>
            </div>

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
