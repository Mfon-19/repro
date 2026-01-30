import AuthCTAButton from '@/components/AuthCTAButton';

export default function Hero() {
  return (
    <section className="min-h-screen pt-32 pb-20 px-4 flex flex-col items-center justify-center relative border-b border-[var(--border)]">
      
      {/* Background Grid Accent */}
      <div className="absolute top-0 right-0 w-1/3 h-full border-l border-[var(--border)] opacity-20 pointer-events-none hidden lg:block"></div>
      
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Text Content */}
          <div className="text-left">
            <div className="text-[var(--accent)] mb-4 text-sm font-bold tracking-widest">
              SYSTEM_STATUS: ONLINE
            </div>
            
            <h1 className="text-5xl sm:text-7xl font-bold leading-none mb-6 tracking-tighter">
              IMPLEMENT<br />
              RESEARCH<br />
              <span className="text-transparent bg-clip-text bg-[var(--foreground)]" style={{ WebkitTextStroke: '2px var(--foreground)' }}>
                PAPERS
              </span>
            </h1>

            <p className="text-lg text-[var(--foreground)]/70 mb-10 max-w-xl leading-relaxed">
              MASTER MACHINE LEARNING ENGINEERING. LEETCODE-STYLE IMPLEMENTATION CHALLENGES FOR LANDMARK PAPERS.
              <br/><br/>
              &gt; NO FLUFF.<br/>
              &gt; PURE CODE.<br/>
              &gt; HARD SKILLS.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <AuthCTAButton className="btn-solid">
                START_IMPLEMENTING_
              </AuthCTAButton>
              <AuthCTAButton className="btn-outline">
                BROWSE_PAPERS()
              </AuthCTAButton>
            </div>
          </div>

          {/* Code Terminal Visual */}
          <div className="w-full">
            <div className="terminal-window shadow-none">
              <div className="terminal-header">
                <div className="flex gap-2">
                  <span>repro_user@machine:~/projects/attention</span>
                </div>
                <div>-- VIM --</div>
              </div>
              <div className="p-6 font-mono text-sm leading-6 overflow-hidden">
                <div className="flex">
                  <span className="w-8 text-[#444] select-none text-right mr-4">1</span>
                  <span className="syntax-keyword">class</span> <span className="syntax-function">SelfAttention</span>(nn.Module):
                </div>
                <div className="flex">
                  <span className="w-8 text-[#444] select-none text-right mr-4">2</span>
                  <span className="pl-4"><span className="syntax-keyword">def</span> <span className="syntax-function">__init__</span>(self, embed_size, heads):</span>
                </div>
                <div className="flex">
                  <span className="w-8 text-[#444] select-none text-right mr-4">3</span>
                  <span className="pl-8">super(SelfAttention, self).__init__()</span>
                </div>
                <div className="flex">
                  <span className="w-8 text-[#444] select-none text-right mr-4">4</span>
                  <span className="pl-8">self.embed_size = embed_size</span>
                </div>
                <div className="flex">
                  <span className="w-8 text-[#444] select-none text-right mr-4">5</span>
                  <span className="pl-8">self.heads = heads</span>
                </div>
                <div className="flex">
                  <span className="w-8 text-[#444] select-none text-right mr-4">6</span>
                  <span className="pl-8">self.head_dim = embed_size // heads</span>
                </div>
                <div className="flex">
                  <span className="w-8 text-[#444] select-none text-right mr-4">7</span>
                  <span className="pl-8 text-dim"># Validate embedding size</span>
                </div>
                <div className="flex">
                  <span className="w-8 text-[#444] select-none text-right mr-4">8</span>
                  <span className="pl-8"><span className="syntax-keyword">assert</span> (self.head_dim * heads == embed_size)</span>
                </div>
                <div className="flex">
                  <span className="w-8 text-[#444] select-none text-right mr-4">9</span>
                  <span className="pl-8 text-[var(--accent)] animate-pulse">_</span>
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--border)] text-xs text-[#666]">
                  "attention.py" 9L, 342B written
                </div>
              </div>
            </div>
            
            {/* Brutalist Decoration */}
            <div className="mt-4 flex justify-between text-xs text-[#444]">
              <span>CPU: 12%</span>
              <span>MEM: 4.2GB</span>
              <span>UPTIME: 42h 12m</span>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
