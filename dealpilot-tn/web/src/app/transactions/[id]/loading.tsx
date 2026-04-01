export default function TransactionLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 text-slate-300">
      <div className="rounded-2xl border border-slate-700 bg-[#0B1530] p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="h-6 w-64 bg-slate-700 rounded animate-pulse" />
          <div className="h-10 w-52 bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
          <div className="h-[520px] bg-slate-900/40 rounded-xl animate-pulse" />
          <div className="h-[520px] bg-slate-900/40 rounded-xl animate-pulse" />
        </div>
      </div>
    </main>
  )
}
