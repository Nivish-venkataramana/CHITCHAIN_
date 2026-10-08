import React from "react";
import { PoolDashboard } from "@/features/pool/components/PoolDashboard";

interface Props {
  params: {
    id: string;
  };
  searchParams?: {
    vault?: string;
  };
}

export const metadata = {
  title: "Circle Pool Dashboard | ChitChain",
  description: "View real-time pool accounting, cycle calendar, member contribution statuses, and scheduler controls."
};

export default function CirclePoolPage({ params, searchParams }: Props) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <PoolDashboard circleId={params.id} vaultAddress={searchParams?.vault} />
    </div>
  );
}
