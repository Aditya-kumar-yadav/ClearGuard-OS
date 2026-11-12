"use client";

import React from "react";
import {
  CheckCircle2,
  Loader2,
  ShieldAlert,
  X,
  ArrowRight,
  Lock,
  Shield,
  CreditCard,
  Server,
} from "lucide-react";
import { PayPalLogo } from "./BrandLogos";

export interface SettlementFlowState {
  isOpen: boolean;
  mode: "CAPTURE" | "VOID";
  phase: "running" | "success" | "error";
  activeStep: number; // 1..4 while running, 4 when done
  tx: any;
  result?: any;
  errorMessage?: string;
}

interface SettlementFlowModalProps {
  flow: SettlementFlowState | null;
  formatTxMoney: (tx: any) => string;
  onClose: () => void;
  onOpenReceipt: (tx: any) => void;
}

export const SettlementFlowModal: React.FC<SettlementFlowModalProps> = ({
  flow,
  formatTxMoney,
  onClose,
  onOpenReceipt,
}) => {
  if (!flow || !flow.isOpen || !flow.tx) return null;

  const { tx, mode, phase, activeStep, result, errorMessage } = flow;
  const isCapture = mode === "CAPTURE";
  const isSuccess = phase === "success";
  const isError = phase === "error";
  const isRunning = phase === "running";

  const captureId = result?.paypal_capture_id || tx.paypal_capture_id;
  const disputeOrVoidId = result?.paypal_dispute_id || result?.void_id || tx.paypal_dispute_id;

  const steps = isCapture
    ? [
        {
          id: 1,
          title: "Escrow Lock & State Guard",
          endpoint: `LEDGER_LOCK • Verify status === "AUTHORIZED"`,
          detail: tx.paypal_auth_id ? `Auth ID: ${tx.paypal_auth_id}` : `Order ${tx.id}`,
        },
        {
          id: 2,
          title: "ClearGuard Settlement API",
          endpoint: `POST /api/transactions/${tx.id}/capture`,
          detail: `Idempotency key: cap-${tx.id}`,
        },
        {
          id: 3,
          title: "PayPal Sandbox Live Payout API",
          endpoint: `POST /v2/payments/authorizations/${tx.paypal_auth_id || "{auth_id}"}/capture`,
          detail: isSuccess && captureId
            ? `Settled • Capture ID: ${captureId}`
            : "Transfers held funds from Buyer → Merchant",
        },
        {
          id: 4,
          title: "SHA-256 Ledger & Persistence",
          endpoint: "compute_state_hash(...) → ledger_cache.json",
          detail: isSuccess ? "Immutable CAPTURED block anchored" : "Anchoring final payout receipt",
        },
      ]
    : [
        {
          id: 1,
          title: "Escrow Protection Guard",
          endpoint: `LEDGER_LOCK • Inspect ${tx.id}`,
          detail: tx.paypal_auth_id ? `Auth ID: ${tx.paypal_auth_id}` : `Order ${tx.id}`,
        },
        {
          id: 2,
          title: "ClearGuard Void / Dispute API",
          endpoint: `POST /api/transactions/${tx.id}/void`,
          detail: "Halting merchant release to protect buyer",
        },
        {
          id: 3,
          title: "PayPal Sandbox Release API",
          endpoint: `POST /v2/payments/authorizations/${tx.paypal_auth_id || "{auth_id}"}/void`,
          detail: isSuccess
            ? disputeOrVoidId
              ? `Protection ID: ${disputeOrVoidId}`
              : "Authorization hold released back to buyer"
            : "Cancelling escrow hold on PayPal",
        },
        {
          id: 4,
          title: "SHA-256 Ledger & Persistence",
          endpoint: "compute_state_hash(...) → ledger_cache.json",
          detail: isSuccess ? "Immutable VOIDED block anchored" : "Recording buyer protection state",
        },
      ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-slate-900/35 backdrop-blur-sm overscroll-contain">
      <div
        className={`w-full max-w-xl rounded-[28px] border bg-white text-slate-900 shadow-2xl overflow-hidden transition-colors ${
          isSuccess && isCapture
            ? "border-emerald-300 shadow-[0_24px_70px_rgba(16,185,129,0.16)]"
            : isError || (isSuccess && !isCapture)
            ? "border-rose-300 shadow-[0_24px_70px_rgba(244,63,94,0.16)]"
            : "border-[#dcd4f5] shadow-[0_24px_70px_rgba(124,58,237,0.16)]"
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#ece8f8] bg-[#f8f7fc] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-2xl border flex items-center justify-center shrink-0 ${
                isSuccess && isCapture
                  ? "bg-emerald-50 border-emerald-200"
                  : isRunning
                  ? "bg-violet-50 border-violet-200"
                  : "bg-rose-50 border-rose-200"
              }`}
            >
              <PayPalLogo className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold tracking-tight text-slate-900 truncate">
                  {isRunning
                    ? isCapture
                      ? "Executing Live PayPal Payout..."
                      : "Releasing Buyer Escrow Hold..."
                    : isSuccess && isCapture
                    ? "Payment Settled to Merchant"
                    : isSuccess
                    ? "Buyer Protected — Hold Released"
                    : "Settlement Intercepted"}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                    isRunning
                      ? "bg-violet-100 text-[#6d28d9] border border-violet-200 animate-pulse"
                      : isSuccess && isCapture
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {isRunning ? "LIVE API" : isSuccess ? (isCapture ? "PAID • 200 OK" : "VOIDED") : "FAILED"}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 truncate">
                {tx.id} &bull; {tx.item_name} &bull; {formatTxMoney(tx)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isRunning}
            className="p-1.5 rounded-xl bg-white hover:bg-violet-50 border border-[#ece8f8] text-slate-500 hover:text-slate-900 disabled:opacity-35 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Money Movement Visual Rail */}
          <div className="rounded-2xl border border-[#ebe6fa] bg-[#faf9ff] p-3.5">
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center">
              <div className="rounded-xl bg-white border border-[#ebe6fa] px-2.5 py-2 shadow-xs">
                <span className="text-[9px] font-mono text-slate-400 block uppercase">Buyer Sandbox</span>
                <span className="text-[11px] font-bold text-slate-800 block truncate">Reserved Hold</span>
              </div>

              <ArrowRight
                className={`w-4 h-4 ${
                  isRunning ? "text-[#7c3aed] animate-pulse" : isSuccess ? "text-emerald-600" : "text-slate-400"
                }`}
              />

              <div
                className={`rounded-xl border px-2.5 py-2 transition-colors shadow-xs ${
                  isRunning
                    ? "bg-violet-50 border-violet-200"
                    : isSuccess && isCapture
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-white border-[#ebe6fa]"
                }`}
              >
                <span className="text-[9px] font-mono text-slate-500 block uppercase">PayPal Escrow</span>
                <span className="text-[11px] font-extrabold text-slate-900 block tabular-nums">
                  {formatTxMoney(tx)}
                </span>
              </div>

              <ArrowRight
                className={`w-4 h-4 ${
                  isRunning
                    ? "text-[#7c3aed] animate-pulse"
                    : isSuccess && isCapture
                    ? "text-emerald-600"
                    : "text-rose-500"
                }`}
              />

              <div
                className={`rounded-xl border px-2.5 py-2 transition-colors shadow-xs ${
                  isSuccess && isCapture
                    ? "bg-emerald-50 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
                    : isSuccess && !isCapture
                    ? "bg-rose-50 border-rose-200"
                    : "bg-white border-[#ebe6fa]"
                }`}
              >
                <span className="text-[9px] font-mono text-slate-500 block uppercase">
                  {isCapture ? tx.merchant_name || "Merchant" : "Buyer Refunded"}
                </span>
                <span
                  className={`text-[11px] font-extrabold block truncate ${
                    isSuccess && isCapture
                      ? "text-emerald-700"
                      : isSuccess
                      ? "text-rose-700"
                      : "text-slate-500"
                  }`}
                >
                  {isRunning ? "Settling..." : isSuccess && isCapture ? "PAID" : isSuccess ? "RETURNED" : "HELD"}
                </span>
              </div>
            </div>
          </div>

          {/* 4-Step Live API Call Feed */}
          <div className="space-y-2">
            {steps.map((step) => {
              const stepDone = isSuccess || (isRunning && activeStep > step.id);
              const stepActive = isRunning && activeStep === step.id;
              const stepFailed = isError && activeStep === step.id;

              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border px-3.5 py-2.5 flex items-start gap-3 transition-all ${
                    stepActive
                      ? "bg-violet-50 border-violet-300 shadow-sm"
                      : stepDone
                      ? isCapture
                        ? "bg-emerald-50/70 border-emerald-200"
                        : "bg-rose-50/70 border-rose-200"
                      : stepFailed
                      ? "bg-rose-50 border-rose-300"
                      : "bg-[#f8f7fc] border-[#ebe6fa] opacity-65"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {stepActive ? (
                      <Loader2 className="w-4 h-4 text-[#7c3aed] animate-spin" />
                    ) : stepDone ? (
                      <CheckCircle2 className={`w-4 h-4 ${isCapture ? "text-emerald-600" : "text-rose-600"}`} />
                    ) : stepFailed ? (
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Server className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {step.id}. {step.title}
                      </span>
                      <span className="text-[10px] font-mono font-semibold text-slate-500 shrink-0">
                        {stepActive ? "CALLING..." : stepDone ? "200 OK" : stepFailed ? "ERROR" : "QUEUED"}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-[#6d28d9] truncate">{step.endpoint}</p>
                    <p className="text-[10px] text-slate-600 truncate">{step.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live PayPal Receipt / Error Banner */}
          {isSuccess && (
            <div
              className={`rounded-2xl border p-3.5 flex items-center justify-between gap-3 ${
                isCapture
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-rose-50 border-rose-200"
              }`}
            >
              <div className="min-w-0 space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                  {isCapture ? "PayPal Live Capture Confirmation" : "PayPal Protection Confirmation"}
                </span>
                <p className={`text-xs font-mono font-bold truncate ${isCapture ? "text-emerald-700" : "text-rose-700"}`}>
                  {isCapture
                    ? `Capture ID: ${captureId || "Confirmed"} (${result?.capture_status || "COMPLETED"})`
                    : result?.message || "Authorization voided on PayPal Sandbox."}
                </p>
              </div>
              <CreditCard className={`w-5 h-5 shrink-0 ${isCapture ? "text-emerald-600" : "text-rose-600"}`} />
            </div>
          )}

          {isError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage || "PayPal API rejected settlement call."}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#ece8f8] bg-[#f8f7fc] flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono text-slate-500 inline-flex items-center gap-1">
            <Lock className="w-3 h-3 text-[#7c3aed]" />
            <span>PayPal Sandbox Orders v2</span>
          </span>

          <div className="flex items-center gap-2">
            {!isRunning && (
              <button
                type="button"
                onClick={() => onOpenReceipt(tx)}
                className="btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-[#7c3aed]" />
                <span>Inspect Proof</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isRunning}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer disabled:opacity-40 ${
                isSuccess && isCapture
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                  : "btn-violet"
              }`}
            >
              {isRunning ? "Calling PayPal..." : "Done"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

