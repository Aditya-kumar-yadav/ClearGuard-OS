import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuroraPay OS • Autonomous AI Escrow Protocol",
  description: "Autonomous Hostage Money & Auto-Dispute Escrow Protocol for PayPal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-[#f6f4fe] text-slate-900 antialiased selection:bg-violet-200 selection:text-violet-950">
      <body className="min-h-screen bg-[#f6f4fe] text-slate-900">{children}</body>
    </html>
  );
}
