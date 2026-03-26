"use client";

import { signOutAndRedirectToLogin } from "@/lib/auth-client";
import { useSidebarProfile } from "@/lib/hooks/useSidebarProfile";

export default function SidebarUserFooter() {
  const { displayName, brokerage, initials, loading } = useSidebarProfile();

  return (
    <div className="p-4 border-t border-gray-800 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
        {loading ? "…" : initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">
          {loading ? <span className="text-gray-500">Loading…</span> : displayName}
        </p>
        {brokerage ? <p className="text-gray-400 text-xs truncate">{brokerage}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => {
          void signOutAndRedirectToLogin();
        }}
        className="text-sm text-gray-400 hover:text-white p-1 rounded shrink-0"
        title="Logout"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  );
}
