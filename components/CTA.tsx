import AuthCTAButton from '@/components/AuthCTAButton';

export default function CTA() {
  return (
    <section className="py-32 px-4 border-b border-[var(--border)] bg-[var(--foreground)] text-[var(--background)]">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tighter leading-none">
          INITIATE_PROTOCOL
        </h2>
        <p className="text-lg md:text-xl font-bold opacity-80 mb-12 max-w-2xl mx-auto">
          JOIN THE NETWORK OF ENGINEERS BUILDING THE FUTURE OF AI.
        </p>

        <div className="flex flex-col md:flex-row gap-4 justify-center max-w-lg mx-auto">
          <input 
            type="email" 
            placeholder="ENTER_EMAIL_ADDRESS" 
            className="flex-1 bg-transparent border-2 border-[var(--background)] p-4 placeholder-[var(--background)]/50 focus:outline-none focus:bg-[var(--background)]/5 font-bold"
          />
          <AuthCTAButton className="bg-[var(--background)] text-[var(--foreground)] px-8 py-4 font-bold border-2 border-[var(--background)] hover:bg-transparent hover:text-[var(--background)] transition-colors">
            EXECUTE
          </AuthCTAButton>
        </div>
      </div>
    </section>
  );
}
