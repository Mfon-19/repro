const userPapers = [
  {
    id: 'PPR_021',
    title: 'RAFT',
    category: 'DISTRIBUTED_SYSTEMS',
    status: 'SPEC_READY',
    contributors: 14,
  },
  {
    id: 'PPR_016',
    title: 'LSM_TREE',
    category: 'DATABASES',
    status: 'IN_PROGRESS',
    contributors: 9,
  },
];

const communityPapers = [
  {
    id: 'PPR_132',
    title: 'MAPREDUCE',
    category: 'DISTRIBUTED_SYSTEMS',
    contributors: 42,
  },
  {
    id: 'PPR_127',
    title: 'SPARK_RDD',
    category: 'DATA_SYSTEMS',
    contributors: 31,
  },
  {
    id: 'PPR_119',
    title: 'SEMAPHORE_COMPILER',
    category: 'COMPILERS',
    contributors: 18,
  },
  {
    id: 'PPR_104',
    title: 'VECTOR_DATABASES',
    category: 'ML_SYSTEMS',
    contributors: 27,
  },
];

import UploadPaperModal from '@/components/UploadPaperModal';

const categories = [
  'DISTRIBUTED_SYSTEMS',
  'DATABASES',
  'COMPILERS',
  'PL',
  'ML_SYSTEMS',
  'NETWORKING',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-6 py-20">
      <div className="container mx-auto max-w-6xl">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-12">
          <div>
            <div className="text-xs text-[#666] mb-3">HOME</div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">YOUR_LAB</h1>
            <p className="text-sm text-[var(--foreground)]/70 max-w-2xl">
              TRACK YOUR ACTIVE REPRODUCTIONS, DISCOVER WHAT THE COMMUNITY IS BUILDING, AND
              START A NEW PAPER IN MINUTES.
            </p>
          </div>
          <UploadPaperModal />
        </header>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">YOUR_PAPERS</h2>
            <span className="text-xs text-[#666]">{userPapers.length} ACTIVE</span>
          </div>
          {userPapers.length === 0 ? (
            <div className="border border-dashed border-[var(--border)] p-6 text-sm text-[#666]">
              NO PAPERS YET. UPLOAD YOUR FIRST PDF TO BEGIN.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userPapers.map((paper) => (
                <article key={paper.id} className="border border-[var(--border)] bg-black/40 p-6">
                  <div className="flex items-center justify-between text-xs text-[#666] mb-3">
                    <span>{paper.id}</span>
                    <span className="border border-[var(--border)] px-3 py-1">{paper.status}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{paper.title}</h3>
                  <p className="text-xs text-[#666] mb-4">{paper.category}</p>
                  <div className="flex items-center justify-between text-xs text-[#666]">
                    <span>CONTRIBUTORS {paper.contributors}</span>
                    <button className="btn-outline text-xs px-4 py-2">OPEN</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">COMMUNITY_PAPERS</h2>
            <span className="text-xs text-[#666]">PAPERS {communityPapers.length}</span>
          </div>
          <p className="text-xs text-[#666] mb-6 max-w-2xl">
            EACH PAPER HAS A SINGLE SHARED CODE SCAFFOLD. JOIN ANY PAPER TO REPRODUCE
            WITH THE COMMUNITY TEMPLATE AND HISTORY.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {communityPapers.map((paper) => (
              <article key={paper.id} className="border border-[var(--border)] bg-black/30 p-4">
                <div className="text-xs text-[#666] mb-2">{paper.id}</div>
                <h3 className="text-lg font-bold mb-1">{paper.title}</h3>
                <p className="text-[10px] text-[#666] mb-4">{paper.category}</p>
                <div className="flex items-center justify-between text-[10px] text-[#666]">
                  <span>WORKED_ON {paper.contributors}</span>
                  <button className="btn-outline text-[10px] px-3 py-2">REPRODUCE</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-[var(--border)] bg-black/20 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="text-xs text-[#666] mb-2">CATEGORIES</div>
              <h2 className="text-2xl font-bold mb-3">BROWSE_BY_FIELD</h2>
              <p className="text-sm text-[#666] max-w-xl">
                FILTER THE ARCHIVE BY DOMAIN. FIND PAPERS WITH ACTIVE DISCUSSIONS AND VERIFIED SPECS.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button key={category} className="btn-outline text-[10px] px-3 py-2">
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
