import React from 'react';

export default function PartiesPanel(){
  return (
    <div className="p-4 bg-card rounded shadow-sm">
      <h2 className="font-semibold">Parties</h2>
      <p className="text-sm text-muted-foreground">Buyer and seller contacts for this transaction.</p>
      <ul className="mt-3 space-y-2">
        <li className="p-2 bg-muted rounded">John Doe — Buyer</li>
        <li className="p-2 bg-muted rounded">Jane Smith — Seller</li>
      </ul>
    </div>
  );
}
