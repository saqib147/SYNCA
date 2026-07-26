export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-zinc-950 text-white">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
          <span>●</span> Synca Monorepo Initialized
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
          Unified Real-Time Workspace
        </h1>
        <p className="text-lg text-zinc-400">
          Collaborate seamlessly across projects, Kanban task boards, real-time DMs, and channels — all governed by fine-grained permissions.
        </p>
      </div>
    </main>
  );
}
