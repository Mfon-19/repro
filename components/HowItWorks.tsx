const steps = [
  {
    step: '01',
    label: 'UPLOAD_PAPER',
    desc: 'UPLOAD A PAPER TO START.',
    details: 'WE GENERATE A CODE SCAFFOLD FROM THE PDF.'
  },
  {
    step: '02',
    label: 'IMPLEMENT_SOLUTION',
    desc: 'FILL IN THE TODOs.',
    details: 'USE THE PAPER AS YOUR SPEC.'
  },
  {
    step: '03',
    label: 'SUBMIT',
    desc: 'RUN TESTS AND SUBMIT.',
    details: 'ITERATE UNTIL IT PASSES.'
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 border-b border-[var(--border)]">
      <div className="container mx-auto max-w-7xl px-4">
        <h2 className="text-4xl font-bold mb-16 tracking-tighter">
          // HOW_IT_WORKS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={s.step} className="relative">
              {/* Connector Line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-[1px] bg-[var(--border)] -ml-4 z-0"></div>
              )}
              
              <div className="relative z-10 bg-[var(--background)] pr-4">
                <div className="text-6xl font-bold text-[var(--border)] mb-6">
                  {s.step}
                </div>
                <h3 className="text-xl font-bold text-[var(--accent)] mb-2">
                  {s.label}
                </h3>
                <p className="font-bold mb-2">
                  {s.desc}
                </p>
                <p className="text-sm text-[#666]">
                  {s.details}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
