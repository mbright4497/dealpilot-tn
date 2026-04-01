export default function TransactionLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[70%_30%]">
        <section className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-slate-700 bg-[#0B1530] p-5">
            <div className="h-5 w-72 bg-slate-700 rounded animate-pulse" />
            <div className="mt-3 flex gap-2">
              <div className="h-5 w-20 bg-slate-700 rounded-full animate-pulse" />
              <div className="h-5 w-20 bg-slate-700 rounded-full animate-pulse" />
            </div>
            <div className="mt-2 h-4 w-48 bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="h-10 rounded-xl border border-slate-800 bg-slate-900/60 animate-pulse" />
          <div className="h-[460px] rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse" />
        </section>
        <div className="rounded-2xl border border-slate-700 bg-[#0B1530] h-[600px] animate-pulse" />
      </div>
    </main>
  )
}
