"use client";

import React, { useState } from "react";
import {
  Shield,
  Bell,
  ArrowUp,
  ArrowDown,
  Plus,
  ChevronDown,
  Home,
  ShoppingBag,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Play,
  Lock,
  Eye,
  Zap,
  Clock,
  RefreshCw,
  CreditCard,
  Sliders,
  DollarSign,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Product } from "./ProductCatalog";

interface LuxuryWalletViewProps {
  mandate: {
    max_single_spend: number;
    max_budget?: number;
    total_budget: number;
    total_pool?: number;
    remaining_budget: number;
    remaining_pool?: number;
    allowed_categories: string;
  };
  connectedAccount: any;
  transactions: any[];
  products: Product[];
  killSwitchStatus: any;
  loading: boolean;
  currency: "USD" | "INR";
  onToggleCurrency: () => void;
  onOpenSetAmountModal: () => void;
  onProcure: (product: Product) => Promise<any>;
  onTriggerDemo: (endpoint: string) => Promise<any>;
  onRunVisionDelivery: (scenario: "INTACT_PACKAGE" | "CRUSHED_DAMAGE" | "WRONG_ADDRESS") => Promise<any>;
  onRunMakerChecker: () => Promise<any>;
  onTriggerKillSwitch: () => Promise<any>;
  onResetKillSwitch: () => Promise<any>;
  onOpenAuthModal: () => void;
  onResetDemo: () => Promise<void>;
  onSimulateDelivery: (txId: string) => Promise<void>;
}

export const LuxuryWalletView: React.FC<LuxuryWalletViewProps> = ({
  mandate,
  connectedAccount,
  transactions,
  products,
  killSwitchStatus,
  loading,
  currency,
  onToggleCurrency,
  onOpenSetAmountModal,
  onProcure,
  onTriggerDemo,
  onRunVisionDelivery,
  onRunMakerChecker,
  onTriggerKillSwitch,
  onResetKillSwitch,
  onOpenAuthModal,
  onResetDemo,
  onSimulateDelivery,
}) => {
  const [activeTab, setActiveTab] = useState<"transactions" | "procure" | "protocols">("transactions");
  const [autopilotRunning, setAutopilotRunning] = useState(false);
  const [autopilotStep, setAutopilotStep] = useState<number | null>(null);
  const [actionNotice, setActionNotice] = useState<any>(null);
  const [selectedTxDetail, setSelectedTxDetail] = useState<any>(null);

  const RATE = 85.0;
  const formatMoney = (inrAmount: number | undefined | null) => {
    const val = typeof inrAmount === "number" && !isNaN(inrAmount) ? inrAmount : 0;
    if (currency === "USD") {
      const usd = val / RATE;
      return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const currentRemaining = mandate?.remaining_budget ?? mandate?.remaining_pool ?? 150000;
  const currentMaxSpend = mandate?.max_single_spend ?? mandate?.max_budget ?? 55000;

  const runAutopilot = async () => {
    if (autopilotRunning || loading) return;
    setAutopilotRunning(true);
    setActionNotice({ status: "RUNNING", message: "Starting 1-Click Autonomous Pitch Pipeline..." });

    try {
      setAutopilotStep(1);
      setActionNotice({ status: "BLOCKED", message: "Stage 1/3: Rogue AI purchase blocked by OpenGuardrails gate (403 Forbidden)." });
      await onTriggerDemo("/api/demo/simulate-hacked-ai");
      await new Promise((r) => setTimeout(r, 2600));

      setAutopilotStep(2);
      setActionNotice({ status: "CAPTURED", message: "Stage 2/3: Dell Inspiron ₹50,000 PayPal Escrow captured upon verified delivery." });
      await onTriggerDemo("/api/demo/simulate-delivery");
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      await new Promise((r) => setTimeout(r, 2600));

      setAutopilotStep(3);
      setActionNotice({ status: "DISPUTED", message: "Stage 3/3: Carrier delay detected &rarr; Gemini AI filed PayPal Dispute claim." });
      await onTriggerDemo("/api/demo/simulate-lost-package");
      await new Promise((r) => setTimeout(r, 1600));

      setAutopilotStep(4);
      setActionNotice({ status: "SUCCESS", message: "✅ Autopilot completed all 3 thin slices successfully!" });
    } finally {
      setAutopilotRunning(false);
    }
  };

  const handleQuickProcure = async (prod: Product) => {
    setActionNotice({ status: "LOADING", message: `Submitting procurement request for ${prod.name}...` });
    const res = await onProcure(prod);
    setActionNotice(res);
    if (res?.status === "CAPTURED" || res?.status === "SUCCESS") {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }
  };

  return (
    <div className="w-full max-w-[400px] mx-auto py-2 flex flex-col items-center">
      {/* Phone Chassis Container */}
      <div className={`w-full bg-[#0c0d10] border border-[#23262f] rounded-[2.75rem] p-3 shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_0_10px_#18191f] relative overflow-hidden transition-all duration-300 ${
        killSwitchStatus.is_locked_down ? "ring-8 ring-rose-600" : ""
      }`}>
        {/* Dynamic Island / Speaker cutout */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-between px-3 border border-zinc-800/80">
          <div className="w-2 h-2 rounded-full bg-zinc-900" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#00d084] animate-pulse" />
        </div>

        {/* TOP BLACK WALLET CARD (Exact match to reference photo) */}
        <div className="bg-[#121317] border border-[#21232b] rounded-[2.25rem] p-5 pt-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#00d084]/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Bar: Avatar + Title + Notification Bell */}
          <div className="flex items-center justify-between mb-4 relative z-10">
            {/* User Avatar */}
            <div
              onClick={onOpenAuthModal}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-500 p-[1.5px] cursor-pointer hover:scale-105 transition-transform"
              title="PayPal Account Delegation"
            >
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                <span className="text-[10px] font-bold font-mono text-white">AP</span>
              </div>
            </div>

            {/* Title */}
            <div className="text-center">
              <span className="text-xs font-semibold tracking-wide text-zinc-300">
                Your Wallet
              </span>
              <div className="flex items-center justify-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d084] animate-pulse" />
                <span className="text-[9px] font-mono text-[#00d084]">PAYPAL SANDBOX</span>
              </div>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={onResetDemo}
                className="w-9 h-9 rounded-full bg-[#181920] border border-[#262833] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                title="Reset Demo Data"
              >
                <Bell className="w-3.5 h-3.5" />
              </button>
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#00d084]" />
            </div>
          </div>

          {/* Currency Selector Pill (Matches Image 2 `[ Amount 0.00 | usd v ]`) */}
          <div className="flex justify-center mb-1 relative z-10">
            <button
              onClick={onToggleCurrency}
              className="flex items-center space-x-1.5 px-3 py-1 bg-[#191a22] hover:bg-[#232530] border border-[#262835] rounded-full text-[11px] font-medium text-zinc-300 transition-colors"
            >
              <ChevronDown className="w-3 h-3 text-zinc-400" />
              <span className="font-semibold">{currency}</span>
            </button>
          </div>

          {/* Balance Label & Editable Balance Typography */}
          <div
            onClick={onOpenSetAmountModal}
            className="text-center my-2 relative z-10 cursor-pointer group"
            title="Click to Set Wallet Balance & Spending Cap"
          >
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium mb-0.5 flex items-center justify-center space-x-1 group-hover:text-[#00d084] transition-colors">
              <span>Balance</span>
              <Sliders className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans group-hover:scale-[1.02] transition-transform">
              {formatMoney(currentRemaining)}
            </h1>
            <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
              Delegated Escrow &bull; Cap: {formatMoney(currentMaxSpend)}/tx
            </p>
          </div>

          {/* Action Buttons: [ ↑ ↓ ] and [ ▷ Autopilot Pitch ] */}
          <div className="flex items-center justify-center space-x-3 my-3 relative z-10">
            {/* Transfer / Procure Pill */}
            <button
              onClick={() => setActiveTab(activeTab === "procure" ? "transactions" : "procure")}
              className={`flex items-center justify-center space-x-2.5 px-5 py-2.5 rounded-full border transition-all ${
                activeTab === "procure"
                  ? "bg-[#00d084] text-black border-[#00d084] shadow-md font-bold"
                  : "bg-[#181920] text-zinc-300 border-[#262833] hover:border-zinc-500 hover:text-white"
              }`}
              title="Procure Items"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <ArrowDown className="w-3.5 h-3.5" />
            </button>

            {/* Quick Mandate / Autopilot Pitch Pill */}
            <button
              onClick={runAutopilot}
              disabled={autopilotRunning || loading}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                autopilotRunning
                  ? "bg-[#00d084] text-black border-[#00d084] animate-spin"
                  : "bg-[#181920] text-zinc-300 border-[#262833] hover:border-zinc-500 hover:text-white"
              }`}
              title="1-Click Autopilot Video Pitch Runner"
            >
              {autopilotRunning ? <RefreshCw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>

            {/* Set Budget Amount Button */}
            <button
              onClick={onOpenSetAmountModal}
              className="w-10 h-10 rounded-full bg-[#181920] border border-[#262833] text-zinc-300 hover:border-zinc-500 hover:text-white flex items-center justify-center transition-all"
              title="Set Custom Balance & Mandate"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Virtual Card / Cards Carousel (Exact match to reference photo) */}
          <div className="mt-2 relative z-10">
            <div className="flex items-center space-x-2.5">
              {/* Main Mastercard / PayPal Virtual Card */}
              <div
                onClick={onOpenAuthModal}
                className="flex-1 bg-gradient-to-br from-[#171820] to-[#121318] border border-[#262834] rounded-xl p-3 cursor-pointer hover:border-zinc-500 transition-all shadow-md group"
              >
                <div className="text-[10px] font-mono tracking-widest text-zinc-400 mb-1.5">
                  •••• •••• •••• 2030
                </div>
                <div className="flex items-center justify-between">
                  {/* Mastercard interlocking circles */}
                  <div className="flex items-center -space-x-1.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-rose-500/90" />
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-500/90" />
                  </div>
                  <span className="text-[8px] font-mono text-zinc-400 uppercase group-hover:text-white transition-colors">
                    {connectedAccount?.status === "VERIFIED" ? "ACTIVE SANDBOX" : "CONNECT"}
                  </span>
                </div>
              </div>

              {/* Add Card / Account Button */}
              <button
                onClick={onOpenAuthModal}
                className="w-12 h-[58px] rounded-xl bg-[#181920] border border-[#262833] hover:border-zinc-500 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                title="Connect PayPal Account"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* "Add Account" link at bottom */}
            <div className="text-center mt-2.5">
              <button
                onClick={onOpenAuthModal}
                className="text-[10px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors underline-offset-4 hover:underline truncate max-w-[240px]"
              >
                {connectedAccount?.email ? connectedAccount.email : "Add Account"}
              </button>
            </div>
          </div>

          {/* Pull Handle Pill */}
          <div className="w-8 h-1 bg-zinc-800 rounded-full mx-auto mt-3" />
        </div>

        {/* ACTION / NOTIFICATION BANNER */}
        {actionNotice && (
          <div className={`mt-2.5 p-3 rounded-xl text-xs font-mono border transition-all ${
            actionNotice.status === "BLOCKED"
              ? "bg-[#241113] border-rose-500/50 text-rose-300"
              : actionNotice.status === "CAPTURED" || actionNotice.status === "SUCCESS"
              ? "bg-[#102319] border-[#00d084]/50 text-[#00d084]"
              : actionNotice.status === "DISPUTED"
              ? "bg-[#251e12] border-amber-500/50 text-amber-300"
              : "bg-[#14151a] border-[#22242e] text-zinc-300"
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center text-[11px]">
                {actionNotice.status === "BLOCKED" && <AlertTriangle className="w-3 h-3 mr-1 text-rose-400" />}
                {actionNotice.status === "CAPTURED" && <CheckCircle2 className="w-3 h-3 mr-1 text-[#00d084]" />}
                {actionNotice.status}
              </span>
              <button onClick={() => setActionNotice(null)} className="text-[10px] text-zinc-400 hover:text-white">✕</button>
            </div>
            <p className="mt-0.5 text-[10px] leading-tight font-sans text-zinc-300">
              {actionNotice.message || actionNotice.reason}
            </p>
          </div>
        )}

        {/* BOTTOM CONTENT SECTION */}
        <div className="p-3 pt-4 pb-16">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1.5">
              <h3 className="text-xs font-bold text-white">
                {activeTab === "transactions" && "Transactions"}
                {activeTab === "procure" && "Target Catalog"}
                {activeTab === "protocols" && "Protocols"}
              </h3>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#181920] text-zinc-400 border border-[#242630]">
                {activeTab === "transactions" ? transactions.length : products.length}
              </span>
            </div>

            <button
              onClick={() => setActiveTab(activeTab === "transactions" ? "procure" : "transactions")}
              className="text-[10px] font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              {activeTab === "transactions" ? "Procure &rarr;" : "&larr; Ledger"}
            </button>
          </div>

          {/* TAB 1: TRANSACTIONS LIST */}
          {activeTab === "transactions" && (
            <div className="space-y-2">
              {transactions.map((tx, idx) => {
                const isBlocked = tx.status === "BLOCKED";
                const isCaptured = tx.status === "CAPTURED";
                const isDisputed = tx.status === "DISPUTED";

                return (
                  <div
                    key={tx.id || idx}
                    onClick={() => setSelectedTxDetail(tx)}
                    className="surface-card-subtle p-2.5 transition-all cursor-pointer flex items-center justify-between hover:border-zinc-500 shadow-sm"
                  >
                    <div className="flex items-center space-x-2.5 truncate mr-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold ${
                        isBlocked
                          ? "bg-[#2a1215] text-rose-400"
                          : isCaptured
                          ? "bg-[#13241b] text-[#00d084]"
                          : "bg-[#181922] text-zinc-300"
                      }`}>
                        {isBlocked ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : isCaptured ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <ShoppingBag className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">
                          {tx.item_name}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate">
                          {isBlocked
                            ? "403 Forbidden &bull; OpenGuardrails"
                            : isCaptured
                            ? `Captured &bull; PayPal Order ${tx.paypal_order_id ? tx.paypal_order_id.slice(-6) : "Direct"}`
                            : isDisputed
                            ? `Dispute Filed &bull; ${tx.paypal_dispute_id || "Reclaim"}`
                            : `Escrow Hold (AUTHORIZE)`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={`text-xs font-bold font-mono ${isBlocked ? "text-rose-400 line-through" : "text-white"}`}>
                        {formatMoney(tx.amount)}
                      </p>
                      <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded-full uppercase font-bold inline-block mt-0.5 ${
                        isBlocked
                          ? "bg-[#331417] text-rose-300"
                          : isCaptured
                          ? "bg-[#13241b] text-[#00d084]"
                          : isDisputed
                          ? "bg-[#281f12] text-amber-300"
                          : "bg-[#122230] text-sky-300"
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                );
              })}

              {transactions.length === 0 && (
                <div className="text-center py-6 text-zinc-500 font-mono text-[11px]">
                  No transactions yet. Click the ▷ button above to run the Autopilot pitch!
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PRODUCT CATALOG */}
          {activeTab === "procure" && (
            <div className="space-y-2">
              {products.map((p) => {
                const isRogue = p.category === "luxury";

                return (
                  <div
                    key={p.id}
                    className={`surface-card-subtle p-2.5 transition-all flex items-center justify-between ${
                      isRogue ? "border-rose-900/50 bg-[#160c0e]/40" : ""
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs font-bold text-white truncate">
                          {p.name}
                        </span>
                        {isRogue && (
                          <span className="text-[8px] font-mono px-1 bg-rose-600 text-white font-bold rounded">
                            ROGUE
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {p.merchant} &bull; {p.category}
                      </p>
                      <p className={`text-xs font-mono font-bold mt-0.5 ${isRogue ? "text-rose-400" : "text-white"}`}>
                        {formatMoney(p.amount)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleQuickProcure(p)}
                      disabled={loading}
                      className={
                        isRogue
                          ? "px-2.5 py-1 bg-[#3a1418] text-rose-300 rounded-lg text-[10px] font-semibold"
                          : "btn-mint px-2.5 py-1 text-[10px] font-semibold"
                      }
                    >
                      {isRogue ? "Test 403" : "Procure"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: PROTOCOLS */}
          {activeTab === "protocols" && (
            <div className="space-y-2 text-xs font-mono">
              <div className="surface-card-subtle p-3 space-y-1.5">
                <span className="font-bold text-white text-[11px] flex items-center">
                  <Eye className="w-3.5 h-3.5 mr-1 text-[#00d084]" />
                  Gemini Vision POD
                </span>
                <p className="text-[10px] text-zinc-400 font-sans">
                  Inspects parcel photos &amp; releases escrow only if packaging is undamaged.
                </p>
                <div className="flex space-x-1.5 pt-1">
                  <button
                    onClick={() => onRunVisionDelivery("INTACT_PACKAGE")}
                    className="flex-1 py-1 btn-mint text-[9px] font-semibold text-center"
                  >
                    Pass (Intact)
                  </button>
                  <button
                    onClick={() => onRunVisionDelivery("CRUSHED_DAMAGE")}
                    className="flex-1 py-1 bg-[#331417] text-rose-300 rounded-lg text-[9px] font-semibold"
                  >
                    Dispute (Crushed)
                  </button>
                </div>
              </div>

              <div className="surface-card-subtle p-3 space-y-1.5">
                <span className="font-bold text-white text-[11px] flex items-center">
                  <Lock className="w-3.5 h-3.5 mr-1 text-sky-400" />
                  Maker-Checker HMAC
                </span>
                <p className="text-[10px] text-zinc-400 font-sans">
                  Dual-agent authorization: Agent 1 Buyer &rarr; Agent 2 Auditor HMAC signature.
                </p>
                <button
                  onClick={onRunMakerChecker}
                  className="w-full py-1 btn-secondary text-[9px] font-semibold"
                >
                  Simulate Dual-Agent Sign
                </button>
              </div>

              <div className="surface-card-subtle p-3 space-y-1.5">
                <span className="font-bold text-white text-[11px] flex items-center">
                  <Zap className="w-3.5 h-3.5 mr-1 text-rose-400" />
                  Kill Switch Circuit Breaker
                </span>
                <div className="flex space-x-1.5 pt-1">
                  <button
                    onClick={onTriggerKillSwitch}
                    className="flex-1 py-1 bg-[#331417] text-rose-300 rounded-lg text-[9px] font-semibold"
                  >
                    Trip Breaker
                  </button>
                  <button
                    onClick={onResetKillSwitch}
                    className="flex-1 py-1 btn-secondary text-[9px] font-semibold"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FLOATING BOTTOM NAVIGATION DOCK (Exact match to reference photo) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-2">
          <div className="bg-[#121318]/95 backdrop-blur-md rounded-full px-4 py-2 flex items-center space-x-5 shadow-2xl border border-[#232530]">
            <button
              onClick={() => setActiveTab("transactions")}
              className={`transition-colors ${activeTab === "transactions" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              title="Transactions"
            >
              <Home className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTab("procure")}
              className={`transition-colors ${activeTab === "procure" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              title="Product Catalog"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTab("protocols")}
              className={`transition-colors ${activeTab === "protocols" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              title="Enterprise Protocols"
            >
              <Shield className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={runAutopilot}
            disabled={autopilotRunning || loading}
            className="w-9 h-9 rounded-full bg-[#00d084] text-black flex items-center justify-center hover:bg-[#00e592] transition-colors shadow-xl"
            title="Run 1-Click Autopilot Video Pitch"
          >
            {autopilotRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Transaction Detail Audit Modal */}
      {selectedTxDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="surface-card max-w-xs w-full p-5 text-white font-mono text-xs shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#21232d] pb-2">
              <span className="font-bold text-xs text-white">Transaction Audit</span>
              <button onClick={() => setSelectedTxDetail(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-1.5 text-zinc-300 text-[11px]">
              <div className="flex justify-between">
                <span className="text-zinc-500">Item:</span>
                <span className="font-bold text-white truncate max-w-[170px]">{selectedTxDetail.item_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Amount:</span>
                <span className="font-bold text-[#00d084]">{formatMoney(selectedTxDetail.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Status:</span>
                <span className="font-bold uppercase text-white">{selectedTxDetail.status}</span>
              </div>
              {selectedTxDetail.paypal_order_id && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">PayPal Order:</span>
                  <span className="text-sky-400 font-bold">{selectedTxDetail.paypal_order_id}</span>
                </div>
              )}
            </div>

            {selectedTxDetail.status === "AUTHORIZED" && (
              <button
                onClick={async () => {
                  await onSimulateDelivery(selectedTxDetail.id);
                  setSelectedTxDetail(null);
                }}
                className="w-full py-2 btn-mint text-xs font-bold uppercase mt-2"
              >
                Confirm POD &amp; Capture
              </button>
            )}

            <button
              onClick={() => setSelectedTxDetail(null)}
              className="w-full py-2 btn-secondary text-xs font-bold uppercase"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
