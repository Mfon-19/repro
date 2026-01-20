const features = [
  {
    id: '01',
    title: 'STREAKS_&_LOGS',
    desc: 'Daily commit graph. Maintain consistency. Do not break the chain.',
  },
  {
    id: '02',
    title: 'AUTO_EVALUATION',
    desc: 'Instant unit test feedback. Pass/Fail binary metrics. Hard constraints.',
  },
  {
    id: '03',
    title: 'GLOBAL_RANK',
    desc: 'Competitive leaderboards based on efficiency and correctness.',
  },
  {
    id: '04',
    title: 'PAPER_DATABASE',
    desc: 'Access simplified PDFs and implementation guides. Pure signal.',
  },
];

export default function Features() {
  return (
    <section id="features" className="border-b border-[var(--border)] bg-[var(--background)]">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div 
              key={f.id} 
              className={`
                p-8 border-b md:border-b-0 border-[var(--border)] group hover:bg-white/5 transition-colors
                ${i < 3 ? 'lg:border-r' : ''}
                ${i % 2 === 0 ? 'md:border-r lg:border-r-0' : ''}
              `}
            >
              <div className="text-[var(--accent)] font-bold text-xl mb-4 font-mono">
                [{f.id}]
              </div>
              <h3 className="text-xl font-bold mb-4">{f.title}</h3>
              <p className="text-[#888] text-sm leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
