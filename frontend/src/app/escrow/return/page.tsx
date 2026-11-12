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
    <div className="min-h-screen bg-gradient-to-br from-[#f6f4fe] via-[#faf9ff] to-[#f1edfc] text-slate-900 flex items-center justify-center p-6">
      <div className="max-w-lg w-full surface-card bg-white border border-[#ece8f8] rounded-3xl p-8 shadow-xl shadow-violet-950/5 space-y-6">
        <div className="flex items-center gap-3.5">
          {state === "loading" && (
            <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center shrink-0">
              <Loader2 className="w-6 h-6 text-[#7c3aed] animate-spin" />
            </div>
          )}
          {state === "authorized" && (
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
          )}
          {state === "pending" && (
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-amber-600" />
            </div>
          )}
          {state === "error" && (
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
          )}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7c3aed]">
              AuroraPay • ClearGuard PayPal Return
            </p>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
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

        <p className="text-sm text-slate-600 leading-relaxed">{message}</p>

        <div className="surface-card-subtle bg-[#f8f7fc] border border-[#ebe6fa] rounded-2xl p-4 font-mono text-xs space-y-2 text-slate-600">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">PayPal Order ID</span>
            <span className="text-slate-900 font-semibold">{token || "N/A"}</span>
          </div>
          {payerId && (
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Payer ID</span>
              <span className="text-slate-900 font-semibold">{payerId}</span>
            </div>
          )}
          {details?.tx_id && (
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Transaction ID</span>
              <span className="text-emerald-700 font-bold">{details.tx_id}</span>
            </div>
          )}
          {details?.paypal_auth_id && (
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Authorization ID</span>
              <span className="text-[#6d28d9] font-bold">{details.paypal_auth_id}</span>
            </div>
          )}
          {details?.amount != null && (
            <div className="flex justify-between gap-3 pt-1.5 border-t border-[#ebe6fa]">
              <span className="text-slate-500">Escrow Amount</span>
              <span className="text-slate-900 font-bold">{details.currency || "USD"} {details.amount}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <Link
            href="/"
            className="btn-violet inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Link>
          {state === "error" && token && (
            <button
              onClick={runAuthorization}
              className="btn-secondary px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
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
    <Suspense fallback={<div className="min-h-screen bg-[#f6f4fe] text-slate-600 flex items-center justify-center font-medium">Loading PayPal return handler...</div>}>
      <EscrowReturnContent />
    </Suspense>
  );
}

