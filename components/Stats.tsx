const statData = [
  { key: 'ACTIVE_NODES', value: '15,420' },
  { key: 'PAPERS_INDEXED', value: '0,248' },
  { key: 'TOTAL_COMMITS', value: '892K+' },
  { key: 'UPTIME', value: '99.99%' },
];

export default function Stats() {
  return (
    <section className="border-b border-[var(--border)]">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {statData.map((stat, i) => (
            <div 
              key={stat.key}
              className={`
                p-6 border-b md:border-b-0 border-[var(--border)] text-center
                ${i < 3 ? 'md:border-r' : ''}
                ${i % 2 === 0 ? 'border-r md:border-r-0' : ''}
              `}
            >
              <div className="text-xs text-[#666] mb-1">{stat.key}</div>
              <div className="text-2xl font-bold font-mono tracking-tighter">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
