import React from "react";
import { BiddingContainer } from "@/features/bidding/components/BiddingContainer";

export const metadata = {
  title: "Bidding Round • ChitChain",
  description: "Commit-reveal secret bidding auction for ChitChain circle."
};

interface BiddingPageProps {
  params: {
    id: string;
  };
}

export default function BiddingPage({ params }: BiddingPageProps) {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <BiddingContainer circleId={params.id} />
    </main>
  );
}
