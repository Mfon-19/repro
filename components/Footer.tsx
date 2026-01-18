import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="py-12 border-b border-[var(--border)]">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12">
          
          <div className="max-w-xs">
            <div className="text-xl font-bold mb-4">[REPRO_]</div>
            <p className="text-sm text-[#666]">
              PLATFORM FOR REPRODUCIBLE RESEARCH IMPLEMENTATION. BUILT FOR ENGINEERS.
            </p>
          </div>

          <div className="flex gap-16 text-sm">
            <div>
              <h4 className="font-bold mb-4 text-[#444]">INDEX</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-[var(--accent)]">PAPERS</Link></li>
                <li><Link href="#" className="hover:text-[var(--accent)]">CHALLENGES</Link></li>
                <li><Link href="#" className="hover:text-[var(--accent)]">DOCS</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[#444]">NETWORK</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-[var(--accent)]">GITHUB</Link></li>
                <li><Link href="#" className="hover:text-[var(--accent)]">DISCORD</Link></li>
                <li><Link href="#" className="hover:text-[var(--accent)]">X_CORP</Link></li>
              </ul>
            </div>
          </div>
          
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--border)] flex justify-between items-center text-xs text-[#444]">
          <div>© 2026 REPRO INC. ALL RIGHTS RESERVED.</div>
          <div>EST. 2024 // V2.0.1</div>
        </div>
      </div>
    </footer>
  );
}
