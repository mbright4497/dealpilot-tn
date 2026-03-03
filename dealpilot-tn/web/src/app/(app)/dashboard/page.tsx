// app/(app)/dashboard/page.tsx
import { DashboardV2 } from "@/components/dashboard/DashboardV2";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] px-4 py-6 md:px-8">
      <DashboardV2 />
    </div>
  );
}
