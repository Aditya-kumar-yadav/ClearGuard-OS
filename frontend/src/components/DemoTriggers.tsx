"use client";

import React, { useState } from "react";
import { ShieldAlert, Truck, PackageX, ArrowRight, CheckCircle2, AlertTriangle, Play, Sparkles, Check, Clock } from "lucide-react";
import confetti from "canvas-confetti";

interface DemoTriggersProps {
  onTriggerDemo: (endpoint: string) => Promise<any>;
  loading: boolean;
}

export const DemoTriggers: React.FC<DemoTriggersProps> = ({ onTriggerDemo, loading }) => {
  const [activeBanner, setActiveBanner] = useState<any>(null);
  const [autopilotStep, setAutopilotStep] = useState<number | null>(null);
  const [autopilotRunning, setAutopilotRunning] = useState(false);

  const handleRun = async (type: "hacked" | "delivery" | "lost") => {
    setActiveBanner({ status: "LOADING", message: "Executing real-time demonstration pipeline..." });
    let endpoint = "";
    if (type === "hacked") endpoint = "/api/demo/simulate-hacked-ai";
    else if (type === "delivery") endpoint = "/api/demo/simulate-delivery";
    else if (type === "lost") endpoint = "/api/demo/simulate-lost-package";

    const res = await onTriggerDemo(endpoint);
    setActiveBanner(res);

    if (type === "delivery" && res?.status === "CAPTURED") {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
      });
    }
    return res;
  };

  const runAutopilot = async () => {
    if (autopilotRunning || loading) return;
    setAutopilotRunning(true);

    try {
      // Stage 1: Security Interception
      setAutopilotStep(1);
      await handleRun("hacked");
      await new Promise((r) => setTimeout(r, 2600));

      // Stage 2: Escrow Delivery & Capture
      setAutopilotStep(2);
      await handleRun("delivery");
      await new Promise((r) => setTimeout(r, 2600));

      // Stage 3: Carrier Loss & Auto-Dispute
      setAutopilotStep(3);
      await handleRun("lost");
      await new Promise((r) => setTimeout(r, 1500));

      setAutopilotStep(4); // Completed
    } finally {
      setAutopilotRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 🎬 1-CLICK AUTOPILOT PITCH RUNNER */}
      <div className="border-2 border-white bg-zinc-950 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(255,255,255,0.06)]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold">
            <Play className="w-4 h-4 fill-black" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black font-mono tracking-tight text-white uppercase">
                1-Click Autopilot Video Pitch Mode
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-zinc-800 text-zinc-300 border border-zinc-700">
                PITCH CHEAT CODE
              </span>
            </div>
            <p className="text-[11px] font-mono text-zinc-400">
              Runs the 3 winning hackathon stages sequentially with 2.5s pacing for a 1-take video recording
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {autopilotRunning && (
            <div className="flex items-center space-x-2 font-mono text-[11px] text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-white animate-spin" />
              <span>
                {autopilotStep === 1 && "Stage 1/3: 403 Security Interception..."}
                {autopilotStep === 2 && "Stage 2/3: PayPal Escrow Capture..."}
                {autopilotStep === 3 && "Stage 3/3: Gemini Auto-Dispute Claim..."}
              </span>
            </div>
          )}

          {autopilotStep === 4 && (
            <span className="flex items-center text-[11px] font-mono font-bold text-emerald-400">
              <Check className="w-3.5 h-3.5 mr-1" />
              AUTOPILOT COMPLETE
            </span>
          )}

          <button
            onClick={runAutopilot}
            disabled={autopilotRunning || loading}
            className="px-4 py-2 bg-white hover:bg-zinc-200 text-black font-mono text-xs font-extrabold uppercase transition-all flex items-center space-x-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 fill-black" />
            <span>{autopilotRunning ? "RUNNING PITCH..." : "RUN AUTOPILOT PITCH"}</span>
          </button>
        </div>
      </div>

      {/* 3 Giant Brutalist Demo Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Button 1: Simulate Hacked AI */}
        <button
          onClick={() => handleRun("hacked")}
          disabled={loading || autopilotRunning}
          className={`text-left p-5 border transition-all duration-200 group relative flex flex-col justify-between ${
            autopilotStep === 1
              ? "border-rose-500 bg-rose-950/40 ring-2 ring-rose-500"
              : "border-rose-500/40 bg-zinc-950 hover:bg-rose-950/20 hover:border-rose-500"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase">
                STAGE 1 • 403 SECURITY
              </span>
              <ShieldAlert className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-base font-bold text-white mb-1 group-hover:text-rose-400 transition-colors">
              Simulate Hacked AI
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              AI attempts to purchase a <span className="text-rose-400 font-semibold">₹100,000 Rolex</span>. Watchdog instantly intercepts and blocks with <span className="font-mono text-rose-300 font-bold">403 Forbidden</span>.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center text-xs font-mono font-bold text-rose-400">
            <span>TRIGGER HACK ATTACK</span>
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Button 2: Simulate Delivery */}
        <button
          onClick={() => handleRun("delivery")}
          disabled={loading || autopilotRunning}
          className={`text-left p-5 border transition-all duration-200 group relative flex flex-col justify-between ${
            autopilotStep === 2
              ? "border-emerald-500 bg-emerald-950/40 ring-2 ring-emerald-500"
              : "border-emerald-500/40 bg-zinc-950 hover:bg-emerald-950/20 hover:border-emerald-500"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                STAGE 2 • HOSTAGE ESCROW
              </span>
              <Truck className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-base font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
              Simulate Delivery
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              AI buys a <span className="text-emerald-400 font-semibold">₹50,000 Laptop</span>. Funds frozen in escrow as <span className="font-mono text-emerald-300 font-bold">Authorized (Locked)</span>, then released to <span className="font-mono text-sky-400 font-bold">Captured (Paid)</span>.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center text-xs font-mono font-bold text-emerald-400">
            <span>BUY &amp; VERIFY DELIVERY</span>
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Button 3: Simulate Lost Package */}
        <button
          onClick={() => handleRun("lost")}
          disabled={loading || autopilotRunning}
          className={`text-left p-5 border transition-all duration-200 group relative flex flex-col justify-between ${
            autopilotStep === 3
              ? "border-amber-500 bg-amber-950/40 ring-2 ring-amber-500"
              : "border-amber-500/40 bg-zinc-950 hover:bg-amber-950/20 hover:border-amber-500"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                STAGE 3 • AUTO-DISPUTE AI
              </span>
              <PackageX className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-base font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">
              Simulate Lost Package
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              AI buys a <span className="text-amber-400 font-semibold">₹48,000 Laptop</span>. Carrier declares Lost &rarr; Gemini AI <span className="text-amber-300 font-semibold">autonomously files PayPal Dispute</span> &amp; demands refund!
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center text-xs font-mono font-bold text-amber-400">
            <span>TRIGGER LOSS &amp; CLAIM</span>
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Outcome Toast / Telematics Flash */}
      {activeBanner && (
        <div
          className={`p-4 border font-mono text-xs transition-all duration-200 ${
            activeBanner.status === "LOADING"
              ? "bg-zinc-900 border-zinc-700 text-zinc-300"
              : activeBanner.status === "BLOCKED"
              ? "bg-rose-950/70 border-rose-500 text-rose-200"
              : activeBanner.status === "CAPTURED"
              ? "bg-emerald-950/70 border-emerald-500 text-emerald-200"
              : "bg-amber-950/70 border-amber-500 text-amber-200"
          }`}
        >
          <div className="flex items-center space-x-2 font-bold text-sm mb-1">
            {activeBanner.status === "BLOCKED" && (
              <>
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <span>403 FORBIDDEN &bull; HACKED AI TRANSACTION BLOCKED</span>
              </>
            )}
            {activeBanner.status === "CAPTURED" && (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>200 OK &bull; HOSTAGE MONEY RELEASED VIA PAYPAL CAPTURE</span>
              </>
            )}
            {activeBanner.status === "DISPUTED" && (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>200 OK &bull; GEMINI AI AUTONOMOUS PAYPAL DISPUTE FILED</span>
              </>
            )}
            {activeBanner.status === "LOADING" && <span>Processing Demonstration Event...</span>}
          </div>
          <p className="text-xs font-sans text-zinc-200 leading-relaxed mt-1">
            {activeBanner.message}
          </p>
          {activeBanner.paypal_order_id && (
            <div className="mt-2 text-[11px] text-zinc-400 flex flex-wrap gap-4 border-t border-zinc-800 pt-1.5">
              <span>Order Reference: <strong className="text-white">{activeBanner.paypal_order_id}</strong></span>
              {activeBanner.paypal_capture_id && (
                <span>Capture ID: <strong className="text-sky-300">{activeBanner.paypal_capture_id}</strong></span>
              )}
              {activeBanner.paypal_dispute_id && (
                <span>Dispute Claim: <strong className="text-amber-300">{activeBanner.paypal_dispute_id}</strong></span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
