export default function ChecklistsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Checklists</h1>
        <div className="mt-6 rounded-2xl border border-white/10 bg-gray-900 p-8 text-center">
          <p className="text-lg font-medium">No checklists yet</p>
          <p className="mt-2 text-sm text-gray-400">Checklists will appear here once they are generated for a transaction.</p>
        </div>
      </div>
    </div>
  );
}
