export default function ProtectedLoading() {
  return (
    <main className="min-h-screen bg-[#090b10] text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        {/* Sidebar skeleton */}
        <aside className="flex flex-col border-r border-white/10 bg-[#0d1118] px-4 py-5">
          {/* Logo */}
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="size-9 animate-pulse rounded-lg bg-white/10" />
            <div className="grid gap-1.5">
              <div className="h-3.5 w-16 animate-pulse rounded bg-white/10" />
              <div className="h-2.5 w-24 animate-pulse rounded bg-white/[0.06]" />
            </div>
          </div>

          {/* Nav items */}
          <nav className="mt-8 grid gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2">
                <div className="size-4 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
              </div>
            ))}
          </nav>
        </aside>

        {/* Content skeleton */}
        <section className="min-w-0">
          <header className="border-b border-white/10 px-8 py-5">
            <div className="flex items-center justify-between">
              <div className="h-2.5 w-16 animate-pulse rounded bg-white/10" />
              <div className="h-8 w-40 animate-pulse rounded-xl bg-white/10" />
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div className="grid gap-2">
                <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-72 animate-pulse rounded bg-white/[0.06]" />
              </div>
              <div className="h-9 w-36 animate-pulse rounded-md bg-white/10" />
            </div>
          </header>
          <div className="px-8 py-6">
            <div className="grid gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
