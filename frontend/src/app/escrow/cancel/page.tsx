"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { XCircle, ArrowLeft, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function EscrowCancelContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [statusMsg, setStatusMsg] = useState("Recording PayPal buyer cancellation...");
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setStatusMsg("PayPal checkout was cancelled before an order token was supplied.");
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/api/paypal/cancel?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        setStatusMsg(data?.message || "Order approval cancelled. Zero funds were authorized or captured.");
      })
      .catch(() => {
        setStatusMsg("Order approval cancelled at PayPal. Zero funds were charged.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f4fe] via-[#faf9ff] to-[#f1edfc] text-slate-900 flex items-center justify-center p-6">
      <div className="max-w-lg w-full surface-card p-8 space-y-6">
        <div className="flex items-center gap-3">
          {loading ? <Loader2 className="w-8 h-8 text-amber-500 animate-spin" /> : <XCircle className="w-8 h-8 text-amber-500" />}
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-slate-500">ClearGuard OS • PayPal Escrow Cancel</p>
            <h1 className="text-xl font-bold text-slate-900">Checkout Cancelled</h1>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">{statusMsg}</p>

        {token && (
          <div className="surface-card-subtle p-4 font-mono text-xs text-slate-600">
            Cancelled PayPal Order ID: <span className="text-slate-900 font-semibold">{token}</span>
          </div>
        )}

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 btn-violet text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function EscrowCancelPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f4fe] text-slate-600 flex items-center justify-center">Processing cancellation...</div>}>
      <EscrowCancelContent />
    </Suspense>
  );
}

