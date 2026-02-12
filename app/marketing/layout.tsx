import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Relatório Diário — Marketing | Rose Portal Advocacia",
  description: "Dashboard de relatório diário de marketing (Meta Ads, leads, conversas, investimento).",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a1628] text-gray-100">
      {children}
    </div>
  );
}
