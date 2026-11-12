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
import { PayPalLogo, GeminiLogo, VisionLensLogo } from "./BrandLogos";

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
            className="fixed inset-0 z-30 bg-black/55"
            onClick={() => onToggleBuyPanel(false)}
            aria-hidden="true"
          />
          <div
            className="fixed right-[84px] top-1/2 z-40 w-[400px] max-w-[calc(100vw-100px)] animate-dock-panel"
            role="dialog"
            aria-label="Gemini AI Quick Buy Panel"
          >
          <div className="relative overflow-hidden rounded-3xl border border-zinc-800/90 bg-[#0b0d13] shadow-[0_24px_60px_rgba(0,0,0,0.88)] text-white">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 86% 0%, rgba(16,185,129,0.12), transparent 45%), radial-gradient(circle at 12% 0%, rgba(249,115,22,0.08), transparent 40%)",
              }}
            />

            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center shadow-inner">
                  <GeminiLogo className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-tight text-white">Gemini AI Auto-Buy</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Type anything in plain English &rarr; PayPal Escrow</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleBuyPanel(false)}
                className="p-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white"
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
                      ? "bg-sky-950/60 border-sky-500/50 text-sky-300 animate-pulse"
                      : agentRunResult?.agent
                      ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                      : "bg-zinc-950/90 border-zinc-800 text-zinc-400"
                  }`}
                >
                  1. Gemini Parse
                </div>
                <div
                  className={`px-2 py-1.5 rounded-xl border text-center transition-colors ${
                    isAgentRunning
                      ? "bg-sky-950/40 border-sky-500/30 text-sky-300"
                      : agentRunResult?.status === "GUARDRAIL_BLOCKED" || agentRunResult?.status === "AGENT_BLOCKED"
                      ? "bg-rose-950/60 border-rose-500/50 text-rose-300"
                      : agentRunResult?.status === "ORDER_CREATED"
                      ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                      : "bg-zinc-950/90 border-zinc-800 text-zinc-400"
                  }`}
                >
                  2. Guardrails
                </div>
                <div
                  className={`px-2 py-1.5 rounded-xl border text-center transition-colors ${
                    agentRunResult?.order?.paypal_order_id
                      ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                      : "bg-zinc-950/90 border-zinc-800 text-zinc-400"
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
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                      sample.label.includes("Block")
                        ? "bg-rose-950/30 hover:bg-rose-950/60 border-rose-500/30 text-rose-300"
                        : "bg-zinc-900/90 hover:bg-zinc-800 border-zinc-800 text-zinc-200"
                    }`}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>

              {/* Input Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Purchase Instruction</span>
                  <span className="font-mono text-zinc-500">Cap: {formatMoney(maxSingleSpend)}</span>
                </div>
                <textarea
                  value={agentPrompt}
                  onChange={(e) => onChangeAgentPrompt(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950/90 border border-zinc-800 focus:border-emerald-500 rounded-2xl p-3 text-xs text-white placeholder-zinc-500 outline-none transition-colors resize-none"
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
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-50 text-black text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  {isAgentRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Buying via Gemini...</span>
                    </>
                  ) : (
                    <>
                      <GeminiLogo className="w-4 h-4 brightness-0" />
                      <span>Auto-Buy via Gemini + PayPal</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onToggleBuyPanel(false);
                    onOpenCustomOrder();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium inline-flex items-center gap-1 shrink-0"
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
                      ? "bg-emerald-950/30 border-emerald-500/40"
                      : "bg-rose-950/30 border-rose-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-xs">
                      {agentRunResult.status === "ORDER_CREATED" ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span className={agentRunResult.status === "ORDER_CREATED" ? "text-emerald-200" : "text-rose-200"}>
                        {agentRunResult.status}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">
                      {agentRunResult.agent?.model || "gemini"}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">Item</span>
                    <span className="text-white font-medium truncate max-w-[210px]">
                      {agentRunResult.agent?.analysis?.item_name}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">Estimated INR</span>
                    <span className="font-mono text-zinc-200">
                      ₹{agentRunResult.agent?.analysis?.estimated_amount_inr}
                    </span>
                  </div>

                  {agentRunResult.order?.paypal_order_id && (
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-zinc-800/80">
                      <span className="font-mono text-[11px] text-sky-300">
                        PayPal: {agentRunResult.order.paypal_order_id}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onToggleBuyPanel(false);
                          onGoToOrders();
                        }}
                        className="text-[11px] font-semibold text-emerald-300 hover:underline inline-flex items-center gap-1"
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

      {/* SLEEK RIGHT-EDGE FLOATING GLASS CAPSULE DOCK */}
      <aside
        className="fixed right-3 top-1/2 -translate-y-1/2 z-40 flex items-center select-none"
        aria-label="Quick AI Dock Rail"
      >
        {/* Hover Tooltip Pill (hidden while drawer is open or collapsed) */}
        {hoveredGauge && !isBuyPanelOpen && !isCollapsed && (
          <div className="absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none animate-in fade-in duration-150">
            <div className="px-3.5 py-2.5 shadow-[0_16px_36px_rgba(0,0,0,0.78)] border border-zinc-800 rounded-2xl text-xs w-52 space-y-0.5 bg-[#0c0d13]/95">
              {hoveredGauge === "buy" && (
                <>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    GEMINI AUTO-BUY ({capPct}%)
                  </span>
                  <p className="text-zinc-300 text-[11px]">
                    Click to open the AI Quick-Buy Panel
                  </p>
                </>
              )}
              {hoveredGauge === "pool" && (
                <>
                  <span className="text-[10px] font-mono text-orange-400 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                    ESCROW POOL ({poolPct}%)
                  </span>
                  <p className="text-zinc-300 text-[11px]">
                    Available: <strong className="text-white">{formatMoney(remainingBudget)}</strong> • Click for Custom Order
                  </p>
                </>
              )}
              {hoveredGauge === "vision" && (
                <>
                  <span className="text-[10px] font-mono text-yellow-400 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    VISION POD ({visionPct}%)
                  </span>
                  <p className="text-zinc-300 text-[11px]">
                    Click to open Vision Dashboard
                  </p>
                </>
              )}
              {hoveredGauge === "gear" && (
                <>
                  <span className="text-[10px] font-mono text-zinc-200 font-bold">MANDATE SETTINGS</span>
                  <p className="text-zinc-400 text-[11px]">Configure wallet balance, currency &amp; cap</p>
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
            className="group flex flex-col items-center gap-1.5 py-3 px-2 rounded-full bg-[#0d0e14]/95 hover:bg-[#141620] border border-white/[0.1] hover:border-[#1ed760]/50 shadow-[0_12px_28px_rgba(0,0,0,0.65)] transition-all"
            title="Expand Quick AI Dock"
            aria-label="Expand Quick AI Dock"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#1ed760] group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-mono font-bold text-zinc-400 group-hover:text-white [writing-mode:vertical-rl] tracking-widest uppercase">
              Dock
            </span>
          </button>
        ) : (
          <div className="relative bg-[#0c0d13]/95 border border-white/[0.09] rounded-[26px] py-2.5 px-2 flex flex-col items-center gap-3 shadow-[0_18px_42px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)]">
            {/* Collapse Pill Handle */}
            <button
              type="button"
              onClick={() => {
                playClick();
                setHoveredGauge(null);
                setIsCollapsed(true);
              }}
              className="w-7 h-4 rounded-full bg-white/[0.04] hover:bg-white/[0.1] flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors"
              title="Minimize dock"
              aria-label="Minimize dock"
            >
              <ChevronRight className="w-3 h-3" />
            </button>

            {/* Ring 1: Orange Ring — Custom Order */}
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
                    className="text-white/[0.07]"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#ff6a3d] transition-all duration-500 ease-out"
                    strokeDasharray={`${poolPct}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    style={{ filter: "drop-shadow(0 0 4px rgba(255, 106, 61, 0.55))" }}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <PayPalLogo className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <span className="text-[9px] font-mono font-semibold text-zinc-400 mt-1 group-hover:text-sky-300 transition-colors">
                {poolPct}%
              </span>
            </button>

            {/* Ring 2: Glowing Mint Ring — CLICK TO OPEN STUNNING AI BUY DRAWER */}
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
              aria-label="Toggle Gemini AI Auto-Buy Panel"
            >
              <div
                className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-shadow ${
                  isBuyPanelOpen ? "ring-2 ring-[#1ed760]/70 ring-offset-2 ring-offset-[#0c0d13]" : ""
                }`}
              >
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-white/[0.07]"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#1ed760] transition-all duration-500 ease-out"
                    strokeDasharray={`${capPct}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    style={{ filter: "drop-shadow(0 0 5px rgba(30, 215, 96, 0.7))" }}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {isAgentRunning ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#1ed760] animate-spin" />
                  ) : (
                    <GeminiLogo className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  )}
                </div>
              </div>
              <span className="text-[9px] font-mono font-semibold text-emerald-300 mt-1">
                AI Buy
              </span>
            </button>

            {/* Ring 3: Yellow Ring — Vision Dashboard */}
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
                    className="text-white/[0.07]"
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
                    style={{ filter: "drop-shadow(0 0 4px rgba(234, 179, 8, 0.55))" }}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <VisionLensLogo className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <span className="text-[9px] font-mono font-semibold text-zinc-400 mt-1 group-hover:text-yellow-300 transition-colors">
                {visionPct}%
              </span>
            </button>

            {/* Settings Gear Bulb */}
            <div className="pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  onOpenSettings();
                }}
                onMouseEnter={() => setHoveredGauge("gear")}
                onMouseLeave={() => setHoveredGauge(null)}
                className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-zinc-300 hover:text-white transition-all group"
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
