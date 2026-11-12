"use client";

import React, { useState } from "react";
import {
  Settings,
  X,
  ArrowRight,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Plus,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { PayPalLogo, VisionLensLogo } from "./BrandLogos";

interface EdgeDockRailProps {
  isBuyPanelOpen: boolean;
  onToggleBuyPanel: (open?: boolean) => void;
  onOpenSettings: () => void;
  onOpenCustomOrder: () => void;
  onOpenVisionLab: () => void;
  onGoToOrders: () => void;
  agentPrompt: string;
  onChangeAgentPrompt: (val: string) => void;
  onRunGeminiAgent: () => Promise<void>;
  agentRunResult: any;
  loading: boolean;
  busyAction: string | null;
  remainingBudget: number;
  totalPool: number;
  maxSingleSpend: number;
  formatMoney: (amount: number | undefined | null) => string;
}

const SAMPLE_PROMPTS = [
  {
    label: "Keychron Rs 12k",
    text: "Buy 1 Keychron Wireless Mechanical Keyboard for engineering team under Rs 12000 from Keychron India",
  },
  {
    label: "AWS GPU Rs 15k",
    text: "Provision AWS GPU Compute credits worth Rs 15000 from Amazon Web Services India",
  },
  {
    label: "Rolex Rs 95k (Block)",
    text: "Buy 1 Rolex Luxury Watch for Rs 95000 from Swiss Chrono Vault dealers",
  },
];

export const EdgeDockRail: React.FC<EdgeDockRailProps> = ({
  isBuyPanelOpen,
  onToggleBuyPanel,
  onOpenSettings,
  onOpenCustomOrder,
  onOpenVisionLab,
  onGoToOrders,
  agentPrompt,
  onChangeAgentPrompt,
  onRunGeminiAgent,
  agentRunResult,
  loading,
  busyAction,
  remainingBudget,
  totalPool,
  maxSingleSpend,
  formatMoney,
}) => {
  const [hoveredGauge, setHoveredGauge] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const poolPct = Math.max(8, Math.min(100, Math.round((remainingBudget / (totalPool || 250000)) * 100)));
  const capPct = Math.max(10, Math.min(100, Math.round((maxSingleSpend / (totalPool || 250000)) * 100)));
  const visionPct = 96;
  const isAgentRunning = busyAction === "agent";

  const playClick = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1180, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(680, audioCtx.currentTime + 0.018);
      gain.gain.setValueAtTime(0.035, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.018);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.02);
    } catch {
      // Ignore if AudioContext is blocked
    }
  };

  return (
    <>
      {/* FLOATING STUNNING AI QUICK-BUY DRAWER WHEN EDGE ICON IS CLICKED */}
      {isBuyPanelOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[2px]"
            onClick={() => onToggleBuyPanel(false)}
            aria-hidden="true"
          />
          <div
            className="fixed right-[84px] top-1/2 z-40 w-[400px] max-w-[calc(100vw-100px)] animate-dock-panel"
            role="dialog"
            aria-label="AI Auto-Buy Panel"
          >
          <div className="relative overflow-hidden rounded-3xl border border-[#e5e0fa] bg-white shadow-[0_24px_60px_rgba(109,40,217,0.18)] text-slate-900">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 86% 0%, rgba(124,58,237,0.08), transparent 45%), radial-gradient(circle at 12% 0%, rgba(99,102,241,0.06), transparent 40%)",
              }}
            />

            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-[#ece8f8] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#f3efff] border border-[#e2d6fe] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#7c3aed]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-tight text-slate-900">AI Auto-Buy</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Type anything in plain English &rarr; PayPal Escrow</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleBuyPanel(false)}
                className="p-1.5 rounded-xl bg-[#f7f5fe] hover:bg-violet-100 border border-[#e5e0fa] text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="relative p-5 space-y-3.5 text-xs">
              {/* 3-Stage Live Pipeline Strip */}
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                <div
                  className={`px-2 py-1.5 rounded-xl border text-center transition-colors ${
                    isAgentRunning
                      ? "bg-violet-50 border-violet-300 text-[#6d28d9] animate-pulse font-semibold"
                      : agentRunResult?.agent
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold"
                      : "bg-[#f7f5fe] border-[#ebe6fa] text-slate-500"
                  }`}
                >
                  1. AI Parse
                </div>
                <div
                  className={`px-2 py-1.5 rounded-xl border text-center transition-colors ${
                    isAgentRunning
                      ? "bg-violet-50 border-violet-200 text-[#6d28d9]"
                      : agentRunResult?.status === "GUARDRAIL_BLOCKED" || agentRunResult?.status === "AGENT_BLOCKED"
                      ? "bg-rose-50 border-rose-200 text-rose-700 font-semibold"
                      : agentRunResult?.status === "ORDER_CREATED"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold"
                      : "bg-[#f7f5fe] border-[#ebe6fa] text-slate-500"
                  }`}
                >
                  2. Guardrails
                </div>
                <div
                  className={`px-2 py-1.5 rounded-xl border text-center transition-colors ${
                    agentRunResult?.order?.paypal_order_id
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold"
                      : "bg-[#f7f5fe] border-[#ebe6fa] text-slate-500"
                  }`}
                >
                  3. PayPal Hold
                </div>
              </div>

              {/* 1-Click Presets */}
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_PROMPTS.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => onChangeAgentPrompt(sample.text)}
                    className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors ${
                      sample.label.includes("Block")
                        ? "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700"
                        : "bg-[#f7f5fe] hover:bg-violet-100 border-[#e5e0fa] text-slate-700"
                    }`}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>

              {/* Input Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Purchase Instruction</span>
                  <span className="font-mono text-slate-500">Cap: {formatMoney(maxSingleSpend)}</span>
                </div>
                <textarea
                  value={agentPrompt}
                  onChange={(e) => onChangeAgentPrompt(e.target.value)}
                  rows={3}
                  className="w-full bg-[#faf9ff] border border-[#e5e0fa] focus:border-[#7c3aed] focus:bg-white rounded-2xl p-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition-colors resize-none"
                  placeholder="e.g. Buy 1 Logitech MX Master 3S mouse under Rs 9000..."
                />
              </div>

              {/* Primary CTA + Custom Order Switch */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    onRunGeminiAgent();
                  }}
                  disabled={loading || !agentPrompt.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#8b5cf6] hover:to-[#6366f1] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_8px_20px_rgba(109,40,217,0.28)]"
                >
                  {isAgentRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Running AI Auto-Buy...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
                      <span>AI Auto-Buy via PayPal</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onToggleBuyPanel(false);
                    onOpenCustomOrder();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#f7f5fe] border border-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                  title="Open structured custom order form"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Form</span>
                </button>
              </div>

              {/* Live Result Card */}
              {agentRunResult && (
                <div
                  className={`rounded-2xl border p-3.5 space-y-1.5 ${
                    agentRunResult.status === "ORDER_CREATED"
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-rose-50 border-rose-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-xs">
                      {agentRunResult.status === "ORDER_CREATED" ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <span className={agentRunResult.status === "ORDER_CREATED" ? "text-emerald-800" : "text-rose-800"}>
                        {agentRunResult.status}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {agentRunResult.agent?.model || "gemini"}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Item</span>
                    <span className="text-slate-900 font-semibold truncate max-w-[210px]">
                      {agentRunResult.agent?.analysis?.item_name}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Estimated INR</span>
                    <span className="font-mono text-slate-800 font-semibold">
                      ₹{agentRunResult.agent?.analysis?.estimated_amount_inr}
                    </span>
                  </div>

                  {agentRunResult.order?.paypal_order_id && (
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-emerald-200">
                      <span className="font-mono text-[11px] text-[#6d28d9] font-semibold">
                        PayPal: {agentRunResult.order.paypal_order_id}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onToggleBuyPanel(false);
                          onGoToOrders();
                        }}
                        className="text-[11px] font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Open Escrow Order</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          </div>
        </>
      )}

      {/* SLEEK RIGHT-EDGE FLOATING GLASS CAPSULE DOCK (Exact match to light screenshot) */}
      <aside
        className="fixed right-3 top-1/2 -translate-y-1/2 z-40 flex items-center select-none"
        aria-label="Quick AI Dock Rail"
      >
        {/* Hover Tooltip Pill (hidden while drawer is open or collapsed) */}
        {hoveredGauge && !isBuyPanelOpen && !isCollapsed && (
          <div className="absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none animate-in fade-in duration-150">
            <div className="px-3.5 py-2.5 shadow-[0_14px_34px_rgba(109,40,217,0.16)] border border-[#e5e0fa] rounded-2xl text-xs w-52 space-y-0.5 bg-white/95 backdrop-blur-md">
              {hoveredGauge === "buy" && (
                <>
                  <span className="text-[10px] font-mono text-[#6d28d9] font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-pulse" />
                    AI AUTO-BUY ({capPct}%)
                  </span>
                  <p className="text-slate-600 text-[11px]">
                    Click to open the AI Quick-Buy Panel
                  </p>
                </>
              )}
              {hoveredGauge === "pool" && (
                <>
                  <span className="text-[10px] font-mono text-[#6d28d9] font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-pulse" />
                    ESCROW POOL ({poolPct}%)
                  </span>
                  <p className="text-slate-600 text-[11px]">
                    Available: <strong className="text-slate-900">{formatMoney(remainingBudget)}</strong> • Click for Custom Order
                  </p>
                </>
              )}
              {hoveredGauge === "vision" && (
                <>
                  <span className="text-[10px] font-mono text-amber-600 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    VISION POD ({visionPct}%)
                  </span>
                  <p className="text-slate-600 text-[11px]">
                    Click to open Vision Dashboard
                  </p>
                </>
              )}
              {hoveredGauge === "gear" && (
                <>
                  <span className="text-[10px] font-mono text-slate-800 font-bold">MANDATE SETTINGS</span>
                  <p className="text-slate-500 text-[11px]">Configure wallet balance, currency &amp; cap</p>
                </>
              )}
            </div>
          </div>
        )}

        {isCollapsed ? (
          <button
            type="button"
            onClick={() => {
              playClick();
              setIsCollapsed(false);
            }}
            className="group flex flex-col items-center gap-1.5 py-3 px-2 rounded-full bg-white/95 hover:bg-[#f7f5fe] border border-[#e5e0fa] hover:border-[#7c3aed]/50 shadow-[0_12px_28px_rgba(109,40,217,0.14)] transition-all"
            title="Expand Quick AI Dock"
            aria-label="Expand Quick AI Dock"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#7c3aed] group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-mono font-bold text-slate-500 group-hover:text-[#6d28d9] [writing-mode:vertical-rl] tracking-widest uppercase">
              Dock
            </span>
          </button>
        ) : (
          <div className="relative bg-white/95 backdrop-blur-md border border-[#e5e0fa] rounded-[26px] py-2.5 px-2 flex flex-col items-center gap-3 shadow-[0_16px_38px_rgba(109,40,217,0.14)]">
            {/* Collapse Pill Handle */}
            <button
              type="button"
              onClick={() => {
                playClick();
                setHoveredGauge(null);
                setIsCollapsed(true);
              }}
              className="w-7 h-4 rounded-full bg-[#f5f3ff] hover:bg-violet-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
              title="Minimize dock"
              aria-label="Minimize dock"
            >
              <ChevronRight className="w-3 h-3" />
            </button>

            {/* Ring 1: Violet Ring — Custom Order / Escrow Pool */}
            <button
              type="button"
              onClick={() => {
                playClick();
                onOpenCustomOrder();
              }}
              onMouseEnter={() => setHoveredGauge("pool")}
              onMouseLeave={() => setHoveredGauge(null)}
              className="group flex flex-col items-center focus:outline-none"
              aria-label="Open Custom Escrow Order"
            >
              <div className="relative w-9 h-9 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-violet-100"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#7c3aed] transition-all duration-500 ease-out"
                    strokeDasharray={`${poolPct}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <PayPalLogo className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <span className="text-[9px] font-mono font-semibold text-slate-500 mt-1 group-hover:text-[#6d28d9] transition-colors">
                {poolPct}%
              </span>
            </button>

            {/* Ring 2: Violet Ring — AI Quick-Buy Drawer */}
            <button
              type="button"
              onClick={() => {
                playClick();
                onToggleBuyPanel(!isBuyPanelOpen);
              }}
              onMouseEnter={() => setHoveredGauge("buy")}
              onMouseLeave={() => setHoveredGauge(null)}
              className={`group flex flex-col items-center focus:outline-none transition-transform ${
                isBuyPanelOpen ? "scale-105" : ""
              }`}
              aria-label="Toggle AI Auto-Buy Panel"
            >
              <div
                className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-shadow ${
                  isBuyPanelOpen ? "ring-2 ring-[#7c3aed]/70 ring-offset-2 ring-offset-white" : ""
                }`}
              >
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-violet-100"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#6366f1] transition-all duration-500 ease-out"
                    strokeDasharray={`${capPct}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {isAgentRunning ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#6d28d9] animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-[#7c3aed] group-hover:scale-110 transition-transform" />
                  )}
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-[#6d28d9] mt-1">
                AI Auto
              </span>
            </button>

            {/* Ring 3: Gold Ring — Vision Dashboard */}
            <button
              type="button"
              onClick={() => {
                playClick();
                onOpenVisionLab();
              }}
              onMouseEnter={() => setHoveredGauge("vision")}
              onMouseLeave={() => setHoveredGauge(null)}
              className="group flex flex-col items-center focus:outline-none"
              aria-label="Open Vision Dashboard"
            >
              <div className="relative w-9 h-9 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-amber-100"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#eab308] transition-all duration-500 ease-out"
                    strokeDasharray={`${visionPct}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <VisionLensLogo className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <span className="text-[9px] font-mono font-semibold text-slate-500 mt-1 group-hover:text-amber-600 transition-colors">
                {visionPct}%
              </span>
            </button>

            {/* Settings Gear Bulb */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  onOpenSettings();
                }}
                onMouseEnter={() => setHoveredGauge("gear")}
                onMouseLeave={() => setHoveredGauge(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-[#f3efff] border border-slate-200 hover:border-violet-200 flex items-center justify-center text-slate-500 hover:text-[#6d28d9] transition-all group"
                aria-label="Configure Wallet & Mandate"
              >
                <Settings className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
