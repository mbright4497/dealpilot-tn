import React from 'react';

export default function DealCommandCenter(){
  return (
    <div className="min-h-screen p-4 bg-surface text-on-surface dark:bg-surface-dark dark:text-on-surface-dark">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Deal Command Center</h1>
        <p className="text-sm text-muted-foreground">Overview — quick access to transaction tabs and actions</p>
      </header>

      <nav className="mb-6">
        <ul className="flex gap-2 flex-wrap">
          <li className="px-3 py-2 bg-muted text-muted-foreground rounded">Overview</li>
          <li className="px-3 py-2 bg-muted text-muted-foreground rounded">Parties</li>
          <li className="px-3 py-2 bg-muted text-muted-foreground rounded">Checklist</li>
          <li className="px-3 py-2 bg-muted text-muted-foreground rounded">Documents</li>
        </ul>
      </nav>

      <main>
        <section className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-card rounded shadow-sm">
            <h2 className="font-semibold">Deal Summary</h2>
            <p className="text-sm text-muted-foreground">Key deal data and quick stats will appear here.</p>
          </div>

          <div className="p-4 bg-card rounded shadow-sm">
            <h2 className="font-semibold">Quick Actions</h2>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button className="btn">Add Party</button>
              <button className="btn">Upload Document</button>
              <button className="btn">Start Checklist</button>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h3 className="font-semibold">Recent Activity</h3>
          <div className="mt-2 p-3 bg-muted rounded text-sm text-muted-foreground">No recent activity</div>
        </section>
      </main>
    </div>
  );
}
