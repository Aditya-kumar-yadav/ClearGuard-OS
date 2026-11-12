"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, Loader2, ShieldCheck, ArrowLeft } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function EscrowReturnContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const payerId = searchParams.get("PayerID") || "";

  const [state, setState] = useState<"loading" | "authorized" | "pending" | "error">("loading");
  const [message, setMessage] = useState<string>("Verifying PayPal approval and authorizing escrow lock...");
  const [details, setDetails] = useState<Record<string, any> | null>(null);

  const runAuthorization = async () => {
    if (!token) {
      setState("error");
      setMessage("Missing PayPal order token in return URL.");
      return;
    }

    setState("loading");
    try {
      const retUrl = `${API_BASE}/api/paypal/return?token=${encodeURIComponent(token)}${payerId ? `&PayerID=${encodeURIComponent(payerId)}` : ""}`;
      const retRes = await fetch(retUrl);
      const retData = await retRes.json().catch(() => ({}));
      if (!retRes.ok) {
        setState("error");
        setMessage(retData?.detail?.message || retData?.detail || "PayPal approval verification failed.");
        setDetails(retData);
        return;
      }

      const authRes = await fetch(`${API_BASE}/api/paypal/orders/${encodeURIComponent(token)}/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payer_id: payerId || undefined }),
      });
      const authData = await authRes.json().catch(() => ({}));

      if (authRes.ok && (authData.status === "AUTHORIZED" || authData.paypal_auth_id)) {
        setDetails(authData);
        setState(authData.status === "AUTHORIZATION_PENDING" ? "pending" : "authorized");
        setMessage(
          authData.status === "AUTHORIZATION_PENDING"
            ? "PayPal authorization is pending review."
            : "PayPal Escrow Authorized — Funds held securely until delivery verification."
        );
      } else {
        setDetails(authData);
        setState("error");
        setMessage(authData?.detail?.message || authData?.message || "Could not finalize PayPal authorization.");
      }
    } catch (err: any) {
      setState("error");
      setMessage(err?.message || "Network error communicating with ClearGuard backend.");
    }
  };

  useEffect(() => {
    runAuthorization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, payerId]);

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-[#111827] border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          {state === "loading" && <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />}
          {state === "authorized" && <CheckCircle2 className="w-8 h-8 text-emerald-400" />}
          {state === "pending" && <ShieldCheck className="w-8 h-8 text-amber-400" />}
          {state === "error" && <AlertTriangle className="w-8 h-8 text-red-400" />}
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-slate-400">ClearGuard OS • PayPal Escrow Return</p>
            <h1 className="text-xl font-bold text-white">
              {state === "loading"
                ? "Authorizing Escrow Hold..."
                : state === "authorized"
                ? "Escrow Authorization Locked"
                : state === "pending"
                ? "Authorization Pending"
                : "Authorization Interrupted"}
            </h1>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">{message}</p>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-1.5 text-slate-300">
          <div>PayPal Order ID: <span className="text-white">{token || "N/A"}</span></div>
          {payerId && <div>Payer ID: <span className="text-white">{payerId}</span></div>}
          {details?.tx_id && <div>Transaction ID: <span className="text-emerald-300">{details.tx_id}</span></div>}
          {details?.paypal_auth_id && <div>Authorization ID: <span className="text-emerald-300">{details.paypal_auth_id}</span></div>}
          {details?.amount != null && (
            <div>Escrow Amount: <span className="text-white">{details.currency || "USD"} {details.amount}</span></div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Link>
          {state === "error" && token && (
            <button
              onClick={runAuthorization}
              className="px-4 py-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-colors"
            >
              Retry Authorization
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EscrowReturnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0f1c] text-slate-300 flex items-center justify-center">Loading PayPal return handler...</div>}>
      <EscrowReturnContent />
    </Suspense>
  );
}

