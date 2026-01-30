export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-6 py-24">
      <div className="container mx-auto max-w-5xl">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">WELCOME_TO_REPRO</h1>
        <p className="text-lg text-[var(--foreground)]/70 max-w-2xl">
          Your workspace is ready. Browse papers, generate scaffolds, and submit implementations.
        </p>
      </div>
    </main>
  );
}
