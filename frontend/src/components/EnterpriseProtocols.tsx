"use client";

import React, { useState } from "react";
import { Eye, ShieldCheck, AlertOctagon, CheckCircle2, ShieldAlert, Cpu, Lock, Key, Camera, Sparkles, RefreshCw, AlertTriangle, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";

interface EnterpriseProtocolsProps {
  onRunVisionDelivery: (scenario: "INTACT_PACKAGE" | "CRUSHED_DAMAGE" | "WRONG_ADDRESS") => Promise<any>;
  onRunMakerChecker: (item: any) => Promise<any>;
  onTriggerKillSwitch: () => Promise<any>;
  onResetKillSwitch: () => Promise<any>;
  killSwitchStatus: {
    is_locked_down: boolean;
    lockdown_reason: string;
    recent_disputes_count: number;
    max_disputes_threshold: number;
    circuit_breaker_healthy: boolean;
  };
  loading: boolean;
}

export const EnterpriseProtocols: React.FC<EnterpriseProtocolsProps> = ({
  onRunVisionDelivery,
  onRunMakerChecker,
  onTriggerKillSwitch,
  onResetKillSwitch,
  killSwitchStatus,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState<"vision" | "maker_checker" | "kill_switch">("vision");
  const [visionResult, setVisionResult] = useState<any>(null);
  const [makerCheckerResult, setMakerCheckerResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Vision Trigger
  const handleVisionTest = async (scenario: "INTACT_PACKAGE" | "CRUSHED_DAMAGE" | "WRONG_ADDRESS") => {
    setSubmitting(true);
    setVisionResult({ status: "INSPECTING", message: "Google Gemini 2.0 Flash Vision scanning physical drop-off photo..." });
    const res = await onRunVisionDelivery(scenario);
    setVisionResult(res);
    setSubmitting(false);

    if (res?.status === "CAPTURED") {
      confetti({ particleCount: 110, spread: 80, origin: { y: 0.6 } });
    }
  };

  // Maker-Checker Trigger
  const handleMakerCheckerTest = async (isSafe: boolean) => {
    setSubmitting(true);
    const item = isSafe
      ? { item_name: "OnePlus 12 5G (16GB RAM, 512GB)", category: "electronics", amount: 42000.0, merchant_name: "OnePlus Direct Corporate" }
      : { item_name: "Rolex Submariner Oystersteel Luxury Watch", category: "luxury", amount: 100000.0, merchant_name: "Swiss Chrono Vault Dealers" };

    const res = await onRunMakerChecker(item);
    setMakerCheckerResult(res);
    setSubmitting(false);
  };

  return (
    <div className="border border-zinc-800 bg-black p-5 space-y-4">
      {/* Header with 3 Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-3 gap-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-white">
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-tight text-white">
              Enterprise Assurance Protocols
            </h3>
            <p className="text-[11px] font-mono text-zinc-400">
              Vision Proof-of-Delivery &bull; Dual-Agent Maker-Checker &bull; Autonomous Kill Switch
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border border-zinc-800 p-0.5 bg-zinc-950 font-mono text-xs">
          <button
            onClick={() => setActiveTab("vision")}
            className={`px-3 py-1 font-bold uppercase transition-all flex items-center space-x-1.5 ${
              activeTab === "vision"
                ? "bg-white text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>1. Gemini Vision POD</span>
          </button>
          <button
            onClick={() => setActiveTab("maker_checker")}
            className={`px-3 py-1 font-bold uppercase transition-all flex items-center space-x-1.5 ${
              activeTab === "maker_checker"
                ? "bg-white text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>2. Maker-Checker</span>
          </button>
          <button
            onClick={() => setActiveTab("kill_switch")}
            className={`px-3 py-1 font-bold uppercase transition-all flex items-center space-x-1.5 ${
              activeTab === "kill_switch"
                ? "bg-white text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>3. Kill Switch</span>
          </button>
        </div>
      </div>

      {/* ----------------- TAB 1: GEMINI VISION PROOF-OF-DELIVERY ----------------- */}
      {activeTab === "vision" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Interactive Drop-Off Photo Scenarios */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-zinc-300 uppercase block">
                Simulate Delivery Drop-Off Photo (Physical-to-Digital Bridge)
              </span>

              <div className="grid grid-cols-2 gap-3">
                {/* Scenario A: Pristine Package */}
                <button
                  onClick={() => handleVisionTest("INTACT_PACKAGE")}
                  disabled={submitting || loading || killSwitchStatus.is_locked_down}
                  className="p-3 border border-emerald-500/40 bg-zinc-950 hover:bg-emerald-950/20 text-left transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-emerald-900/30 text-emerald-400 border border-emerald-500/30">
                        FEDEX DROP-OFF
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="w-full h-24 bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden mb-2">
                      <div className="text-center font-mono text-[10px] text-zinc-400">
                        📦 [SEALED CARTON PHOTO]<br />
                        <span className="text-emerald-400 font-bold">100% INTACT &bull; SEAL VALID</span>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-white mb-0.5">Pristine Package</p>
                    <p className="text-[10px] text-zinc-400">Label matches mandate &rarr; Vision releases PayPal Escrow via /capture.</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-zinc-800 text-[10px] font-mono font-bold text-emerald-400 flex items-center">
                    <span>SCAN &amp; RELEASE</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </button>

                {/* Scenario B: Crushed / Damaged Package */}
                <button
                  onClick={() => handleVisionTest("CRUSHED_DAMAGE")}
                  disabled={submitting || loading || killSwitchStatus.is_locked_down}
                  className="p-3 border border-rose-500/40 bg-zinc-950 hover:bg-rose-950/20 text-left transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-rose-900/30 text-rose-400 border border-rose-500/30">
                        TRANSIT TRAUMA
                      </span>
                      <AlertTriangle className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="w-full h-24 bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden mb-2">
                      <div className="text-center font-mono text-[10px] text-zinc-400">
                        📦 [CRUSHED CARTON PHOTO]<br />
                        <span className="text-rose-400 font-bold">68% DEFORMATION &bull; SEALS TORN</span>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-white mb-0.5">Crushed / Damaged Box</p>
                    <p className="text-[10px] text-zinc-400">Vision halts capture &rarr; Autonomously fires PayPal Dispute with visual evidence.</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-zinc-800 text-[10px] font-mono font-bold text-rose-400 flex items-center">
                    <span>SCAN &amp; DISPUTE</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </button>
              </div>
            </div>

            {/* Right: Gemini Vision Live Telematics Report */}
            <div className="border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                  <span className="font-bold text-white flex items-center">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                    GEMINI VISION TELEMATICS SCAN
                  </span>
                  <span className="text-[10px] text-zinc-400">MODEL: gemini-2.0-flash</span>
                </div>

                {visionResult ? (
                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">VERDICT:</span>
                      <span className={`font-bold ${
                        visionResult.status === "CAPTURED" ? "text-emerald-400" : "text-amber-400"
                      }`}>
                        {visionResult.inspection?.analysis?.verdict || visionResult.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">INTEGRITY SCORE:</span>
                      <span className="text-white font-bold">
                        {visionResult.inspection?.analysis?.integrity_score !== undefined
                          ? `${(visionResult.inspection.analysis.integrity_score * 100).toFixed(0)}%`
                          : "SCANNING..."}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">CARRIER / TRACKING:</span>
                      <span className="text-zinc-300">
                        {visionResult.inspection?.analysis?.ocr_extracted?.carrier || "FedEx Express"} &bull; {visionResult.inspection?.analysis?.ocr_extracted?.tracking_number}
                      </span>
                    </div>

                    {visionResult.paypal_capture_id && (
                      <div className="p-2 border border-emerald-500/40 bg-emerald-950/20 text-emerald-300">
                        <span className="font-bold block">PAYPAL CAPTURE EXECUTED:</span>
                        <span>{visionResult.paypal_capture_id}</span>
                      </div>
                    )}

                    {visionResult.paypal_dispute_id && (
                      <div className="p-2 border border-amber-500/40 bg-amber-950/20 text-amber-300">
                        <span className="font-bold block">PAYPAL DISPUTE FIRED AUTONOMOUSLY:</span>
                        <span>{visionResult.paypal_dispute_id}</span>
                      </div>
                    )}

                    {visionResult.inspection?.analysis?.vision_reasoning && (
                      <div className="mt-2 border-t border-zinc-800 pt-2 text-[10px] text-zinc-400 space-y-1">
                        <span className="font-bold text-zinc-300 uppercase">Vision Reasoning Chain:</span>
                        {visionResult.inspection.analysis.vision_reasoning.map((r: string, i: number) => (
                          <div key={i}>&bull; {r}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-zinc-500 text-center py-8">
                    Select a drop-off scenario to trigger Gemini Vision multi-modal verification.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: MULTI-AGENT MAKER-CHECKER PROTOCOL ----------------- */}
      {activeTab === "maker_checker" && (
        <div className="space-y-4 font-mono text-xs">
          <div className="border border-zinc-800 bg-zinc-950 p-4">
            <h4 className="font-bold text-white mb-1 uppercase flex items-center">
              <ShieldCheck className="w-4 h-4 text-sky-400 mr-2" />
              Dual-Control Banking Architecture: Agent 1 (Buyer) + Agent 2 (Air-Gapped Auditor)
            </h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans mb-3">
              To eliminate single-LLM hallucinations, Agent 1 proposes the transaction, but an air-gapped Agent 2 (with 0 network access) must independently verify against the PostgreSQL mandate and issue an HMAC-SHA256 signature.
            </p>

            <div className="flex space-x-3 mb-4">
              <button
                onClick={() => handleMakerCheckerTest(true)}
                disabled={submitting || loading || killSwitchStatus.is_locked_down}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold uppercase transition-colors"
              >
                Simulate Safe Proposal (OnePlus ₹42k)
              </button>
              <button
                onClick={() => handleMakerCheckerTest(false)}
                disabled={submitting || loading || killSwitchStatus.is_locked_down}
                className="flex-1 py-2 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-700 text-rose-300 font-bold uppercase transition-colors"
              >
                Simulate Rogue Proposal (Rolex ₹100k)
              </button>
            </div>

            {/* Visualizer Pipeline */}
            {makerCheckerResult && (
              <div className="border border-zinc-800 bg-black p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  {/* Maker Block */}
                  <div className="p-3 border border-zinc-800 bg-zinc-950 space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase block font-bold">1. MAKER (BUYER AGENT)</span>
                    <div className="text-white font-bold">{makerCheckerResult.maker?.item_name}</div>
                    <div className="text-zinc-400">Amount: ₹{makerCheckerResult.maker?.amount?.toLocaleString("en-IN")}</div>
                    <div className="text-zinc-400">Category: {makerCheckerResult.maker?.category}</div>
                    <div className="text-[10px] text-zinc-500 pt-1">Proposal ID: {makerCheckerResult.maker?.proposal_id}</div>
                  </div>

                  {/* Checker Block */}
                  <div className={`p-3 border ${
                    makerCheckerResult.checker?.approved
                      ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-300"
                      : "border-rose-500/50 bg-rose-950/20 text-rose-300"
                  } space-y-1`}>
                    <span className="text-[10px] text-zinc-500 uppercase block font-bold">2. CHECKER (AIR-GAPPED AUDITOR)</span>
                    <div className="font-bold flex items-center">
                      {makerCheckerResult.checker?.approved ? (
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-400" />
                      )}
                      {makerCheckerResult.checker?.status}
                    </div>
                    <div className="text-[10px] leading-tight">{makerCheckerResult.checker?.reason}</div>
                    {makerCheckerResult.checker?.cryptographic_signature && (
                      <div className="text-[9px] font-mono break-all pt-1 text-zinc-400">
                        HMAC Signature: {makerCheckerResult.checker.cryptographic_signature}
                      </div>
                    )}
                  </div>
                </div>

                <div className={`p-2 border text-xs font-bold text-center ${
                  makerCheckerResult.status === "AUTHORIZED"
                    ? "border-emerald-500 bg-emerald-950/40 text-emerald-300"
                    : "border-rose-600 bg-rose-950/40 text-rose-300"
                }`}>
                  {makerCheckerResult.message}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: AUTONOMOUS KILL SWITCH (CIRCUIT BREAKER) ----------------- */}
      {activeTab === "kill_switch" && (
        <div className="space-y-4 font-mono text-xs">
          <div className={`border p-4 transition-all ${
            killSwitchStatus.is_locked_down
              ? "border-rose-600 bg-rose-950/30 text-rose-200"
              : "border-zinc-800 bg-zinc-950 text-zinc-300"
          }`}>
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
              <div className="flex items-center space-x-2">
                <AlertOctagon className={`w-5 h-5 ${killSwitchStatus.is_locked_down ? "text-rose-500 animate-bounce" : "text-emerald-400"}`} />
                <span className="font-extrabold text-sm uppercase text-white">
                  Autonomous Circuit Breaker &bull; Blast Radius Containment
                </span>
              </div>
              <span className={`px-2 py-0.5 border font-bold text-[10px] uppercase ${
                killSwitchStatus.is_locked_down
                  ? "border-rose-500 bg-rose-600 text-white animate-pulse"
                  : "border-emerald-500 bg-emerald-950 text-emerald-400"
              }`}>
                {killSwitchStatus.is_locked_down ? "CIRCUIT TRIPPED • WALLET FROZEN" : "SYSTEM HEALTHY • ARMED"}
              </span>
            </div>

            <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-4">
              If an AI agent experiences &ge; 3 PayPal disputes within 5 minutes or repeated adversarial injection breaches, the circuit breaker trips autonomously, revoking execution authority and locking the agent wallet.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
              <div className="p-3 bg-black border border-zinc-800">
                <span className="text-zinc-500 block">Rolling 5-Min Dispute Velocity:</span>
                <span className="text-lg font-bold text-white">
                  {killSwitchStatus.recent_disputes_count} / {killSwitchStatus.max_disputes_threshold}
                </span>
              </div>
              <div className="p-3 bg-black border border-zinc-800">
                <span className="text-zinc-500 block">Agent Execution Status:</span>
                <span className={`text-lg font-bold ${killSwitchStatus.is_locked_down ? "text-rose-400" : "text-emerald-400"}`}>
                  {killSwitchStatus.is_locked_down ? "REVOKED / BLOCKED" : "OPERATIONAL"}
                </span>
              </div>
            </div>

            {killSwitchStatus.is_locked_down && (
              <div className="mb-4 p-3 border border-rose-600 bg-rose-950 text-rose-200">
                <span className="font-bold block uppercase mb-1">🚨 LOCKDOWN ACTIVE REASON:</span>
                <p className="font-mono text-xs">{killSwitchStatus.lockdown_reason}</p>
              </div>
            )}

            <div className="flex space-x-3">
              {killSwitchStatus.is_locked_down ? (
                <button
                  onClick={onResetKillSwitch}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-white hover:bg-zinc-200 text-black font-bold uppercase transition-colors"
                >
                  ADMIN OVERRIDE: DISARM CIRCUIT BREAKER &amp; UNFREEZE WALLET
                </button>
              ) : (
                <button
                  onClick={onTriggerKillSwitch}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase transition-colors"
                >
                  DEMO TRIGGER: TRIP KILL SWITCH (SIMULATE ANOMALY SPIKE)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

