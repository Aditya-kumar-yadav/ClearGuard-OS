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
    <html lang="en" className="dark bg-black text-zinc-100 antialiased selection:bg-zinc-800 selection:text-white">
      <head>
        <link rel="stylesheet" href="/output.css" />
      </head>
      <body className="min-h-screen bg-black text-zinc-100">{children}</body>
    </html>
  );
}
