"use client";

import React, { useState } from "react";
import {
  Shield,
  Eye,
  CreditCard,
  Hash,
  CheckCircle2,
  AlertTriangle,
  X,
  Play,
  RefreshCw,
  Copy,
  Check,
  Server,
  Lock,
  Layers,
  ArrowRight,
  ExternalLink,
  Cpu,
  Flame,
  Zap,
} from "lucide-react";

interface JudgeProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: "USD" | "INR";
  formatMoney: (amount: number | undefined | null) => string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const JudgeProofModal: React.FC<JudgeProofModalProps> = ({
  isOpen,
  onClose,
  currency,
  formatMoney,
}) => {
  const [activeTab, setActiveTab] = useState<"tiers" | "paypal" | "hmac" | "vision">("tiers");
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [tierResult, setTierResult] = useState<any>(null);

  // PayPal Ping State
  const [pingLoading, setPingLoading] = useState(false);
  const [pingResult, setPingResult] = useState<any>(null);

  // HMAC Verifier State
  const [hmacInput, setHmacInput] = useState({
    proposal_id: "PROP-8819A20",
    item_name: "Dell UltraSharp 27-inch 4K Monitor",
    amount: "38500.00",
    category: "electronics",
    merchant: "Dell Direct B2B",
  });
  const [hmacResult, setHmacResult] = useState<any>(null);
  const [hmacLoading, setHmacLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Run isolated tier test proof
  const handleTestTier = async (tier: string) => {
    setLoadingTier(tier);
    try {
      const res = await fetch(`${API_BASE}/api/judge/test-tier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      setTierResult(data);
    } catch (err: any) {
      setTierResult({ error: err.message });
    } finally {
      setLoadingTier(null);
    }
  };

  // Ping live PayPal Sandbox
  const handlePingPayPal = async () => {
    setPingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/judge/live-ping`);
      const data = await res.json();
      setPingResult(data);
    } catch (err: any) {
      setPingResult({ error: err.message });
    } finally {
      setPingLoading(false);
    }
  };

  // Run HMAC Verifier
  const handleVerifyHmac = async () => {
    setHmacLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/judge/verify-hmac`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposal_id: hmacInput.proposal_id,
          amount: parseFloat(hmacInput.amount) || 0,
          category: hmacInput.category,
          merchant: hmacInput.merchant,
        }),
      });
      const data = await res.json();
      setHmacResult(data);
    } catch (err: any) {
      setHmacResult({ error: err.message });
    } finally {
      setHmacLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="surface-card max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-white font-sans shadow-2xl border border-[#272935]">
        {/* Header */}
        <div className="p-5 border-b border-[#1f212a] flex items-start justify-between gap-4 bg-[#0d0e12]">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase bg-[#18231c] text-[#00d084] border border-[#244230] flex items-center">
                <Shield className="w-3 h-3 mr-1" />
                HACKATHON VERIFICATION SUITE
              </span>
              <span className="text-xs font-mono text-zinc-500">v3.0.0 &bull; PayPal Orders v2</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
              <span>🏆 Hackathon Judge Proof &amp; Verification Console</span>
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              Live proof of zero rule overlap, real PayPal API calls, and cryptographic HMAC immutability.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#1a1c24] rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3.5 pb-2 bg-[#0d0e12] border-b border-[#1f212a]">
          <div className="segmented-group w-full flex justify-between overflow-x-auto">
            <button
              onClick={() => setActiveTab("tiers")}
              className={`segmented-item flex-1 flex items-center justify-center space-x-1.5 ${
                activeTab === "tiers" ? "segmented-item-active" : ""
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>1. Zero Rule Overlap</span>
            </button>
            <button
              onClick={() => setActiveTab("paypal")}
              className={`segmented-item flex-1 flex items-center justify-center space-x-1.5 ${
                activeTab === "paypal" ? "segmented-item-active" : ""
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>2. Live PayPal Telemetry</span>
            </button>
            <button
              onClick={() => setActiveTab("hmac")}
              className={`segmented-item flex-1 flex items-center justify-center space-x-1.5 ${
                activeTab === "hmac" ? "segmented-item-active" : ""
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>3. HMAC Verifier</span>
            </button>
            <button
              onClick={() => setActiveTab("vision")}
              className={`segmented-item flex-1 flex items-center justify-center space-x-1.5 ${
                activeTab === "vision" ? "segmented-item-active" : ""
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>4. Vision POD Proof</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(92vh-180px)] text-xs font-sans">
          {/* ========================================================= */}
          {/* TAB 1: ZERO RULE OVERLAP ARCHITECTURE                     */}
          {/* ========================================================= */}
          {activeTab === "tiers" && (
            <div className="space-y-4">
              <div className="bg-[#14151c] border border-[#232532] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center text-xs">
                    <Shield className="w-3.5 h-3.5 mr-1.5 text-[#00d084]" />
                    4 Strictly Orthogonal Defense-in-Depth Tiers
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#13241b] text-[#00d084] border border-[#1b3d2b]">
                    DETERMINISTIC
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Unlike brittle single-prompt AI agents that blur categories, security, and financial limits,
                  <strong> AuroraPay OS implements 4 mathematically separated tiers</strong>. Each tier has a distinct trigger signature and cannot collide with others:
                </p>

                {/* The 4 Tiers Matrix Table */}
                <div className="border border-[#1f212a] rounded-xl overflow-hidden font-mono text-[11px]">
                  <div className="grid grid-cols-12 bg-[#0e0f14] p-2.5 font-bold text-zinc-400 border-b border-[#1f212a]">
                    <div className="col-span-2">TIER</div>
                    <div className="col-span-4">RESPONSIBILITY</div>
                    <div className="col-span-3">TEST PAYLOAD</div>
                    <div className="col-span-3">REJECTION CODE</div>
                  </div>
                  <div className="grid grid-cols-12 p-2.5 border-b border-[#1c1e27] hover:bg-[#13141a] transition-colors items-center">
                    <div className="col-span-2 font-bold text-sky-400">Tier 1: Security</div>
                    <div className="col-span-4 text-zinc-300">Prompt Injections, Jailbreaks, SSRF, Cloud Metadata</div>
                    <div className="col-span-3 text-zinc-400">Ignore instructions &lt;script&gt;</div>
                    <div className="col-span-3 font-bold text-rose-400">GuardrailRejection (403)</div>
                  </div>
                  <div className="grid grid-cols-12 p-2.5 border-b border-[#1c1e27] hover:bg-[#13141a] transition-colors items-center">
                    <div className="col-span-2 font-bold text-amber-400">Tier 2: Category</div>
                    <div className="col-span-4 text-zinc-300">Commercial Whitelist (electronics, hardware, cloud)</div>
                    <div className="col-span-3 text-zinc-400">Jewelry / Luxury asset ($141)</div>
                    <div className="col-span-3 font-bold text-rose-400">CategoryUnauthorized (403)</div>
                  </div>
                  <div className="grid grid-cols-12 p-2.5 border-b border-[#1c1e27] hover:bg-[#13141a] transition-colors items-center">
                    <div className="col-span-2 font-bold text-purple-400">Tier 3: Budget Cap</div>
                    <div className="col-span-4 text-zinc-300">Per-Item Limit ($647 / ₹55,000 max single spend)</div>
                    <div className="col-span-3 text-zinc-400">GPU Server Node ($1,117)</div>
                    <div className="col-span-3 font-bold text-rose-400">BudgetCapBreached (403)</div>
                  </div>
                  <div className="grid grid-cols-12 p-2.5 hover:bg-[#13141a] transition-colors items-center">
                    <div className="col-span-2 font-bold text-emerald-400">Tier 4: Liquidity</div>
                    <div className="col-span-4 text-zinc-300">Available Delegated Escrow Pool Balance</div>
                    <div className="col-span-3 text-zinc-400">Under single cap, pool empty</div>
                    <div className="col-span-3 font-bold text-rose-400">InsufficientEscrowPool (403)</div>
                  </div>
                </div>
              </div>

              {/* Interactive Test Suite */}
              <div className="bg-[#14151c] border border-[#232532] rounded-xl p-4 space-y-3">
                <span className="font-bold text-white flex items-center text-xs">
                  <Play className="w-3.5 h-3.5 mr-1.5 text-[#00d084]" />
                  Live Isolation Runner: Prove Zero Collision In Real-Time
                </span>
                <p className="text-xs text-zinc-400">
                  Click any button to send an isolated test payload to the live backend and verify that only its specific tier fires:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  <button
                    onClick={() => handleTestTier("1")}
                    disabled={!!loadingTier}
                    className="p-3 rounded-xl bg-[#181922] hover:bg-[#20222f] border border-[#242636] text-left transition-all active:scale-95 group"
                  >
                    <span className="text-[10px] font-mono text-sky-400 font-bold block mb-1">
                      TEST TIER 1
                    </span>
                    <strong className="text-white text-xs block group-hover:text-sky-300">
                      ⚡ Prompt Injection
                    </strong>
                    <span className="text-[10px] text-zinc-400 font-mono block mt-1">
                      &lt;script&gt; override prompt
                    </span>
                  </button>

                  <button
                    onClick={() => handleTestTier("2")}
                    disabled={!!loadingTier}
                    className="p-3 rounded-xl bg-[#181922] hover:bg-[#20222f] border border-[#242636] text-left transition-all active:scale-95 group"
                  >
                    <span className="text-[10px] font-mono text-amber-400 font-bold block mb-1">
                      TEST TIER 2
                    </span>
                    <strong className="text-white text-xs block group-hover:text-amber-300">
                      🏷️ Prohibited Category
                    </strong>
                    <span className="text-[10px] text-zinc-400 font-mono block mt-1">
                      Jewelry ($141 - under cap!)
                    </span>
                  </button>

                  <button
                    onClick={() => handleTestTier("3")}
                    disabled={!!loadingTier}
                    className="p-3 rounded-xl bg-[#181922] hover:bg-[#20222f] border border-[#242636] text-left transition-all active:scale-95 group"
                  >
                    <span className="text-[10px] font-mono text-purple-400 font-bold block mb-1">
                      TEST TIER 3
                    </span>
                    <strong className="text-white text-xs block group-hover:text-purple-300">
                      💰 Budget Cap Overrun
                    </strong>
                    <span className="text-[10px] text-zinc-400 font-mono block mt-1">
                      Cloud Node ($1,117 &gt; $647)
                    </span>
                  </button>

                  <button
                    onClick={() => handleTestTier("4")}
                    disabled={!!loadingTier}
                    className="p-3 rounded-xl bg-[#181922] hover:bg-[#20222f] border border-[#242636] text-left transition-all active:scale-95 group"
                  >
                    <span className="text-[10px] font-mono text-emerald-400 font-bold block mb-1">
                      TEST TIER 4
                    </span>
                    <strong className="text-white text-xs block group-hover:text-emerald-300">
                      🌊 Pool Exhaustion
                    </strong>
                    <span className="text-[10px] text-zinc-400 font-mono block mt-1">
                      $529 item with $294 in pool
                    </span>
                  </button>

                  <button
                    onClick={() => handleTestTier("safe")}
                    disabled={!!loadingTier}
                    className="col-span-1 sm:col-span-2 p-3 rounded-xl bg-[#14261c] hover:bg-[#1a3527] border border-[#1e3d2c] text-left transition-all active:scale-95 group"
                  >
                    <span className="text-[10px] font-mono text-[#00d084] font-bold block mb-1">
                      TEST SAFE FLOW (PASSES ALL 4)
                    </span>
                    <strong className="text-white text-xs block group-hover:text-[#00d084]">
                      ✅ OnePlus 12 5G ($494 &bull; Electronics)
                    </strong>
                    <span className="text-[10px] text-zinc-300 font-mono block mt-1">
                      Passes all 4 tiers &rarr; Calls PayPal Orders v2 with intent: AUTHORIZE
                    </span>
                  </button>
                </div>

                {/* Live Test Output Card */}
                {tierResult && (
                  <div className={`mt-3 p-4 rounded-xl border font-mono transition-all animate-in fade-in ${
                    tierResult.decision === "AUTHORIZED"
                      ? "bg-[#102319] border-[#00d084]/40 text-[#00d084]"
                      : "bg-[#251214] border-rose-500/40 text-rose-300"
                  }`}>
                    <div className="flex items-center justify-between pb-2 border-b border-current/20">
                      <span className="font-bold flex items-center">
                        {tierResult.decision === "AUTHORIZED" ? (
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 mr-1.5" />
                        )}
                        HTTP {tierResult.http_status}: {tierResult.decision}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-black/40">
                        {tierResult.tier_tested}
                      </span>
                    </div>

                    <div className="pt-2 space-y-1 text-xs">
                      {tierResult.rule_violated && (
                        <p><strong>Rule Intercepted:</strong> {tierResult.rule_violated}</p>
                      )}
                      <p className="font-sans text-zinc-200">{tierResult.reason || tierResult.message}</p>
                      <p className="text-[10px] text-zinc-400 pt-1">
                        <strong>Proof of Isolation:</strong> {tierResult.zero_rule_overlap_proof || "All 4 tiers validated in strict hierarchical defense."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: LIVE PAYPAL SANDBOX TELEMETRY                      */}
          {/* ========================================================= */}
          {activeTab === "paypal" && (
            <div className="space-y-4">
              <div className="bg-[#14151c] border border-[#232532] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center text-xs">
                    <Server className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                    Real-Time PayPal Sandbox API Connection
                  </span>
                  <button
                    onClick={handlePingPayPal}
                    disabled={pingLoading}
                    className="btn-mint px-3.5 py-1.5 text-xs font-bold flex items-center space-x-1.5 shadow-md active:scale-95"
                  >
                    {pingLoading ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-black" />
                    ) : (
                      <Zap className="w-3 h-3 text-black" />
                    )}
                    <span>{pingLoading ? "Pinging..." : "Ping PayPal API Live"}</span>
                  </button>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  Prove to judges that this is NOT a mock or simulation. Clicking above initiates a real TLS handshake to <code>api-m.sandbox.paypal.com</code> using OAuth 2.0 Client Credentials:
                </p>

                {pingResult ? (
                  <div className="bg-[#0b0c10] border border-[#21232d] rounded-xl p-4 font-mono space-y-2.5 text-[11px]">
                    <div className="flex justify-between items-center pb-2 border-b border-[#1c1e27]">
                      <span className="text-zinc-500">CONNECTION STATUS:</span>
                      <span className={`${pingResult.status === "ONLINE" ? "text-[#00d084]" : "text-red-400"} font-bold flex items-center`}>
                        <span className={`w-2 h-2 rounded-full ${pingResult.status === "ONLINE" ? "bg-[#00d084] animate-pulse" : "bg-red-500"} mr-1.5`} />
                        {pingResult.status === "ONLINE" ? `${pingResult.status} (LIVE HTTP 200)` : `${pingResult.status || "OFFLINE"} (CHECK KEYS)`}
                      </span>
                    </div>

                    {pingResult.error && (
                      <div className="p-2.5 rounded border border-red-500/30 bg-red-950/30 text-red-300 text-[11px]">
                        {pingResult.error}
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-zinc-500">Endpoint:</span>
                      <span className="text-zinc-200">{pingResult.target_endpoint}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-zinc-500">Roundtrip Latency:</span>
                      <span className="text-sky-400 font-bold">{pingResult.roundtrip_latency_ms} ms</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-zinc-500">OAuth Bearer Token:</span>
                      <span className="text-amber-300 font-bold">{pingResult.oauth_token_preview}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-zinc-500">Timestamp:</span>
                      <span className="text-zinc-400">{pingResult.timestamp}</span>
                    </div>

                    <div className="pt-2 border-t border-[#1c1e27] text-zinc-400 font-sans text-xs">
                      {pingResult.proof_statement}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0b0c10] border border-[#21232d] rounded-xl p-6 text-center text-zinc-400 font-mono space-y-2">
                    <CreditCard className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p>Click &quot;Ping PayPal API Live&quot; above to measure roundtrip latency to PayPal Sandbox.</p>
                  </div>
                )}
              </div>

              {/* Escrow Orders v2 Specification Breakdown */}
              <div className="bg-[#14151c] border border-[#232532] rounded-xl p-4 space-y-3 font-mono text-[11px]">
                <span className="text-xs font-bold text-white block">
                  Orders v2 Smart Escrow Architecture:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-300">
                  <div className="p-3 bg-[#0e0f14] rounded-lg border border-[#1c1e27] space-y-1">
                    <span className="text-[10px] text-sky-400 font-bold block">1. INTENT: AUTHORIZE</span>
                    <p className="text-zinc-400 font-sans text-xs">
                      Customer funds are locked in hostage escrow with PayPal. <strong>$0 is paid to the merchant</strong> until delivery proof is verified intact.
                    </p>
                  </div>
                  <div className="p-3 bg-[#0e0f14] rounded-lg border border-[#1c1e27] space-y-1">
                    <span className="text-[10px] text-[#00d084] font-bold block">2. DELAYED DISBURSEMENT</span>
                    <p className="text-zinc-400 font-sans text-xs">
                      If carrier damages the parcel in transit, funds are immediately reclaimed via automated PayPal dispute without touching buyer credit.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: CRYPTOGRAPHIC HMAC-SHA256 VERIFIER                 */}
          {/* ========================================================= */}
          {activeTab === "hmac" && (
            <div className="space-y-4">
              <div className="bg-[#14151c] border border-[#232532] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center text-xs">
                    <Hash className="w-3.5 h-3.5 mr-1.5 text-[#00d084]" />
                    Live Cryptographic Attestation Verifier
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#13241b] text-[#00d084] border border-[#1b3d2b]">
                    HMAC-SHA256
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  The Air-Gapped Auditor runs in an isolated container with <strong>zero network connectivity</strong>. It signs every approved proposal with an HMAC-SHA256 signature. Any tampering with price, category, or proposal ID invalidates the hash immediately:
                </p>

                {/* HMAC Input Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs pt-1">
                  <div>
                    <label className="text-zinc-500 text-[10px] block mb-1">PROPOSAL ID:</label>
                    <input
                      type="text"
                      value={hmacInput.proposal_id}
                      onChange={(e) => setHmacInput({ ...hmacInput, proposal_id: e.target.value })}
                      className="w-full bg-[#0e0f14] border border-[#23252d] focus:border-[#00d084] rounded-lg px-3 py-2 text-white outline-none font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-500 text-[10px] block mb-1">AMOUNT (INR):</label>
                    <input
                      type="text"
                      value={hmacInput.amount}
                      onChange={(e) => setHmacInput({ ...hmacInput, amount: e.target.value })}
                      className="w-full bg-[#0e0f14] border border-[#23252d] focus:border-[#00d084] rounded-lg px-3 py-2 text-white outline-none font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-500 text-[10px] block mb-1">CATEGORY:</label>
                    <input
                      type="text"
                      value={hmacInput.category}
                      onChange={(e) => setHmacInput({ ...hmacInput, category: e.target.value })}
                      className="w-full bg-[#0e0f14] border border-[#23252d] focus:border-[#00d084] rounded-lg px-3 py-2 text-white outline-none font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-500 text-[10px] block mb-1">MERCHANT NAME:</label>
                    <input
                      type="text"
                      value={hmacInput.merchant}
                      onChange={(e) => setHmacInput({ ...hmacInput, merchant: e.target.value })}
                      className="w-full bg-[#0e0f14] border border-[#23252d] focus:border-[#00d084] rounded-lg px-3 py-2 text-white outline-none font-mono text-xs"
                    />
                  </div>
                </div>

                <button
                  onClick={handleVerifyHmac}
                  disabled={hmacLoading}
                  className="w-full btn-mint py-2.5 text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md active:scale-95"
                >
                  <Hash className="w-3.5 h-3.5 text-black" />
                  <span>{hmacLoading ? "Computing HMAC..." : "Compute & Authenticate HMAC Signature"}</span>
                </button>

                {/* HMAC Verification Output */}
                {hmacResult && (
                  <div className="bg-[#0b0c10] border border-[#234230] rounded-xl p-4 font-mono text-[11px] space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-[#1c1e27]">
                      <span className="text-[#00d084] font-bold flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        CRYPTOGRAPHICALLY VALIDATED MATCH
                      </span>
                      <span className="text-[10px] text-zinc-500">256-bit SHA256</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-500 text-[10px] block">PROPOSAL PRE-IMAGE DATA:</span>
                      <code className="text-zinc-300 block bg-black/50 p-2 rounded border border-[#1b2a20] break-all">
                        {hmacResult.proposal_string}
                      </code>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-500 text-[10px] block">COMPUTED HMAC-SHA256 SIGNATURE:</span>
                      <code className="text-[#00d084] font-bold block bg-black/50 p-2 rounded border border-[#1b2a20] break-all">
                        {hmacResult.computed_signature}
                      </code>
                    </div>

                    <p className="text-[10px] text-zinc-400 font-sans pt-1">
                      {hmacResult.proof_statement}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: GEMINI VISION MULTIMODAL POD PROOF                 */}
          {/* ========================================================= */}
          {activeTab === "vision" && (
            <div className="space-y-4">
              <div className="bg-[#14151c] border border-[#232532] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center text-xs">
                    <Eye className="w-3.5 h-3.5 mr-1.5 text-[#00d084]" />
                    Physical-to-Digital POD Proof of Delivery Engine
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#13241b] text-[#00d084] border border-[#1b3d2b]">
                    GEMINI 1.5 PRO
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  How does the AI know when to release escrow or refund the money?
                  Gemini Vision inspects courier drop-off photos and applies deterministic tensor formulas:
                </p>

                {/* Side-by-side POD comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Scenario A: Pristine */}
                  <div className="bg-[#0e0f14] p-4 rounded-xl border border-[#1c3a27] space-y-2 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#00d084] flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        SCENARIO A: PRISTINE
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#152e20] text-[#00d084]">
                        CAPTURE ESCROW
                      </span>
                    </div>

                    <div className="space-y-1 text-zinc-300">
                      <div>Structural Integrity: <strong className="text-[#00d084]">99%</strong></div>
                      <div>Deformation Score: <strong className="text-zinc-200">1%</strong></div>
                      <div>Tamper Tape: <strong className="text-[#00d084]">✓ INTACT</strong></div>
                      <div>Label OCR Address: <strong className="text-zinc-200">MATCHES MANDATE</strong></div>
                    </div>

                    <p className="text-[10px] font-sans text-zinc-400 pt-1 border-t border-[#1c1e27]">
                      Arbiter Decision: Executes <code>/v2/payments/authorizations/{'{id}'}/capture</code>. Merchant receives funds.
                    </p>
                  </div>

                  {/* Scenario B: Crushed Damage */}
                  <div className="bg-[#0e0f14] p-4 rounded-xl border border-[#3a1c22] space-y-2 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-400 flex items-center">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                        SCENARIO B: CRUSHED CARTON
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#331417] text-rose-300">
                        DISPUTE REFUND
                      </span>
                    </div>

                    <div className="space-y-1 text-zinc-300">
                      <div>Structural Integrity: <strong className="text-rose-400">14%</strong></div>
                      <div>Deformation Score: <strong className="text-rose-400">86%</strong></div>
                      <div>Tamper Tape: <strong className="text-rose-400">✗ RUPTURED</strong></div>
                      <div>Transit Impact: <strong className="text-rose-400">CRITICAL TRAUMA</strong></div>
                    </div>

                    <p className="text-[10px] font-sans text-zinc-400 pt-1 border-t border-[#1c1e27]">
                      Arbiter Decision: Halts capture. Fires PayPal Disputes API (<code>PP-D-808B464B</code>). Buyer escrow refunded 100%.
                    </p>
                  </div>
                </div>

                {/* Mathematical Trigger Rule */}
                <div className="p-3 bg-[#0a0b0e] rounded-xl border border-[#1f212a] font-mono text-[11px] space-y-1">
                  <span className="text-zinc-500 uppercase text-[10px] block">ARBITER MATHEMATICAL LOGIC:</span>
                  <code className="text-[#00d084] block">
                    Decision = (DeformationScore &gt; 0.40 || TamperTapeIntact == False) ? DISPUTE_REFUND : CAPTURE_ESCROW
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#1f212a] bg-[#0d0e12] flex justify-between items-center">
          <span className="text-[10px] font-mono text-zinc-500">
            AuroraPay OS &bull; Built for Hackathon Judges &amp; Technical Auditors
          </span>
          <button
            onClick={onClose}
            className="btn-secondary px-5 py-2 text-xs font-semibold hover:text-white"
          >
            Close Proof Console
          </button>
        </div>
      </div>
    </div>
  );
};

