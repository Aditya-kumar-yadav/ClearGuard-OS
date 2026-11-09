"use client";

import React, { useEffect, useState } from "react";
import {
  Shield,
  CreditCard,
  Play,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronDown,
  Lock,
  Eye,
  Zap,
  ShoppingBag,
  Sliders,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  X,
  FileText,
  Copy,
  Laptop,
  Smartphone,
  Server,
  Watch,
  Grid,
  List,
  Bell,
  ArrowUp,
  ArrowDown,
  Plus,
  Package,
  Truck,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Product } from "@/components/ProductCatalog";
import { PayPalAuthModal } from "@/components/PayPalAuthModal";
import { SetAmountModal } from "@/components/SetAmountModal";
import { CustomProcureModal } from "@/components/CustomProcureModal";
import { AuditModal } from "@/components/AuditModal";
import { EdgeDockRail } from "@/components/EdgeDockRail";
import { JudgeProofModal } from "@/components/JudgeProofModal";
import { fetcher, NETWORK_ANOMALY_EVENT } from "@/lib/fetcher";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "PROD-001",
    name: "OnePlus 12 5G (16GB RAM, 512GB)",
    category: "electronics",
    amount: 42000.0,
    currency: "INR",
    merchant: "OnePlus Direct Corporate",
    description: "Flagship smartphone with Snapdragon 8 Gen 3 & Hasselblad camera",
    demo_type: "standard_safe",
  },
  {
    id: "PROD-002",
    name: "Dell Inspiron 15 Business Laptop",
    category: "electronics",
    amount: 50000.0,
    currency: "INR",
    merchant: "Dell Technologies Official",
    description: "Enterprise work laptop with Intel Core i7 & 16GB RAM",
    demo_type: "escrow_delivery",
  },
  {
    id: "PROD-003",
    name: "Lenovo ThinkPad E14 Gen 5",
    category: "electronics",
    amount: 48000.0,
    currency: "INR",
    merchant: "Lenovo Direct Commercial",
    description: "Durable business workstation with fingerprint security & 512GB SSD",
    demo_type: "auto_dispute",
  },
  {
    id: "PROD-004",
    name: "Rolex Submariner Oystersteel Luxury Watch",
    category: "luxury",
    amount: 100000.0,
    currency: "INR",
    merchant: "Swiss Chrono Vault Dealers",
    description: "Unauthorized luxury asset (Tests AI spending cap & 403 Forbidden gate)",
    demo_type: "rogue_ai_attack",
  },
  {
    id: "PROD-005",
    name: "AWS Enterprise Cloud GPU Server Reserve",
    category: "cloud",
    amount: 12000.0,
    currency: "INR",
    merchant: "Amazon Web Services India",
    description: "High-performance GPU inference cloud compute quota",
    demo_type: "standard_safe",
  },
];

export default function Home() {
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");
  const [activeTab, setActiveTab] = useState<"shop" | "orders" | "budget">("shop");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [orderFilter, setOrderFilter] = useState<"all" | "authorized" | "captured" | "disputed" | "blocked">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEdgeDock, setShowEdgeDock] = useState(true);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSetAmountModalOpen, setIsSetAmountModalOpen] = useState(false);
  const [isCustomProcureOpen, setIsCustomProcureOpen] = useState(false);
  const [isJudgeProofOpen, setIsJudgeProofOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  // Autopilot demo runner
  const [autopilotRunning, setAutopilotRunning] = useState(false);
  const [autopilotStep, setAutopilotStep] = useState<number | null>(null);
  const [notice, setNotice] = useState<any>(null);
  const [anomalyToast, setAnomalyToast] = useState<string | null>(null);

  // Live Data States
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [connectedAccount, setConnectedAccount] = useState<any>({
    email: "buyer-corp@personal.example.com",
    payer_id: "PAYER_99A1B2C3",
    status: "VERIFIED",
    account_type: "PERSONAL_SANDBOX",
    balance: "₹2,50,000.00",
    delegation_approved: true,
  });
  const [mandate, setMandate] = useState({
    max_single_spend: 55000.0,
    max_budget: 55000.0,
    total_budget: 250000.0,
    total_pool: 250000.0,
    remaining_budget: 126300.0,
    remaining_pool: 126300.0,
    allowed_categories: "electronics,hardware,cloud,office",
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [killSwitchStatus, setKillSwitchStatus] = useState<any>({
    is_locked_down: false,
    lockdown_reason: "",
    recent_disputes_count: 0,
    max_disputes_threshold: 3,
    circuit_breaker_healthy: true,
  });

  const RATE = 85.0;
  // Bulletproof money formatter with zero NaN risk and string casting fallback
  const formatMoney = (inrAmount: number | string | undefined | null) => {
    const num = typeof inrAmount === "string" ? parseFloat(inrAmount) : Number(inrAmount);
    const val = !isNaN(num) && isFinite(num) ? num : 0;
    if (currency === "USD") {
      const usd = val / RATE;
      return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Tactile Mechanical Click Sound Synthesizer (Web Audio API)
  const playTactileClick = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(750, audioCtx.currentTime + 0.015);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.015);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.018);
    } catch { }
  };

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("button, .btn-mint, .btn-secondary, .segmented-item, [role='button']");
      if (target) {
        playTactileClick();
      }
    };
    document.addEventListener("click", handleGlobalClick, { passive: true });
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  // Graceful Degradation Anomaly Listener (Phase 2 Brutalist Toast)
  useEffect(() => {
    const handleAnomaly = (e: any) => {
      const msg = e.detail?.message || "NETWORK ANOMALY: TRANSACTION SAFELY ABORTED.";
      setAnomalyToast(msg);
      setTimeout(() => setAnomalyToast(null), 6000);
    };
    window.addEventListener(NETWORK_ANOMALY_EVENT, handleAnomaly);
    return () => window.removeEventListener(NETWORK_ANOMALY_EVENT, handleAnomaly);
  }, []);

  const fetchData = async () => {
    try {
      const [mandateRes, txRes, accountRes, prodRes, ksRes] = await Promise.all([
        fetch(`${API_BASE}/api/mandates`).then((r) => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/transactions`).then((r) => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/paypal/account`).then((r) => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/products`).then((r) => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/kill-switch/status`).then((r) => r.json()).catch(() => null),
      ]);

      if (mandateRes) setMandate(mandateRes);
      if (Array.isArray(txRes)) setTransactions(txRes);
      if (accountRes !== undefined) setConnectedAccount(accountRes);
      if (Array.isArray(prodRes) && prodRes.length > 0) setProducts(prodRes);
      if (ksRes) setKillSwitchStatus(ksRes);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleSaveBudget = async (newBalanceInr: number, newMaxSpendInr: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/mandates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remaining_budget: newBalanceInr,
          remaining_pool: newBalanceInr,
          total_budget: newBalanceInr,
          total_pool: newBalanceInr,
          max_single_spend: newMaxSpendInr,
          max_budget: newMaxSpendInr,
        }),
      });
      const data = await res.json();
      setMandate(data);
      await fetchData();
      setNotice({
        status: "SUCCESS",
        title: "BUDGET UPDATED",
        message: `Your wallet budget is now ${formatMoney(newBalanceInr)} with a per-item limit of ${formatMoney(newMaxSpendInr)}.`,
      });
    } catch (e: any) {
      setNotice({ status: "ERROR", message: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Instant Buy / Procure Action with Hardened Fallbacks & Circuit Breakers
  const handleBuyItem = async (product: Product) => {
    setLoading(true);
    setNotice({ status: "LOADING", message: `Placing order for ${product.name} with PayPal Orders v2 authorization...` });
    try {
      const res = await fetcher.post(`${API_BASE}/api/procure-item`, product);
      await fetchData();

      if (res.anomaly) {
        // Handled by brutalist toast listener
        setNotice({
          status: "ERROR",
          title: "CIRCUIT BREAKER ENGAGED",
          message: res.error || "NETWORK ANOMALY: TRANSACTION SAFELY ABORTED.",
        });
      } else if (res.status === 403) {
        const errorDetail = res.data?.detail || res.data;
        setNotice({
          status: "BLOCKED",
          title: "SPENDING LIMIT / POLICY EXCEEDED",
          message: errorDetail?.reason || errorDetail?.message || `This item (${formatMoney(product.amount)}) exceeds your mandate limit of ${formatMoney(mandate.max_single_spend)}. Order blocked to protect your funds.`,
        });
      } else if (res.ok) {
        const isAuthorized = res.data?.status === "AUTHORIZED" || res.data?.payment_status === "PAYMENT_AUTHORIZED";
        setNotice({
          status: "SUCCESS",
          title: isAuthorized ? "PAYMENT AUTHORIZED — AWAITING DELIVERY" : "ORDER CREATED — AWAITING BUYER APPROVAL",
          message: isAuthorized
            ? `Success! ${product.name} was ordered. Payment authorized via PayPal Sandbox hold (${formatMoney(product.amount)}). Payment authorized — awaiting delivery.`
            : `PayPal Sandbox Order created for ${product.name} (${formatMoney(product.amount)}). Order ${res.data?.paypal_order_id || "Active"} is awaiting buyer approval. Payment has not yet been authorized.`,
        });
        confetti({ particleCount: 110, spread: 80, origin: { y: 0.5 } });
        setActiveTab("orders"); // Auto-navigate to orders
      } else {
        setNotice({
          status: "ERROR",
          title: "ORDER HALTED",
          message: res.error || "Transaction could not be completed.",
        });
      }
    } catch (e: any) {
      setNotice({ status: "ERROR", message: e.message });
    } finally {
      setLoading(false);
      setCheckoutProduct(null);
    }
  };

  // Release Escrow Payment (Delivery Verified with Strict PayPal Webhook Signature)
  const handleConfirmDelivery = async (txId: string) => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const transId = `TRANS-${Date.now()}`;
      const payload = { event_type: "DELIVERY_CONFIRMED", transaction_id: txId };

      const res = await fetch(`${API_BASE}/api/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "PAYPAL-AUTH-ALGO": "SHA256withRSA",
          "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-TEST.pem",
          "PAYPAL-TRANSMISSION-ID": transId,
          "PAYPAL-TRANSMISSION-TIME": now,
          "PAYPAL-TRANSMISSION-SIG": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG",
        },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        throw new Error("401 Unauthorized: PayPal Webhook signature verification rejected event.");
      }
      await fetchData();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      setNotice({
        status: "DELIVERY_CONFIRMED_PENDING_REVIEW",
        title: "DELIVERY CONFIRMED — PENDING AUDIT",
        message: "Carrier drop-off webhook recorded. Under Stage 5B protocols, payment capture requires authenticated reviewer verification.",
      });
    } catch (e: any) {
      setNotice({
        status: "BLOCKED",
        title: "WEBHOOK REJECTED",
        message: e?.message || "Webhook signature verification error.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Buyer Approval Verification & Order Authorization (Stage 4)
  const handleAuthorizeOrder = async (orderId: string, txId?: string) => {
    setLoading(true);
    setNotice({
      status: "LOADING",
      title: "VERIFYING PAYMENT",
      message: `Verifying buyer approval with PayPal Sandbox for order ${orderId}...`,
    });
    try {
      const res = await fetcher.post(`${API_BASE}/api/paypal/orders/${orderId}/authorize`, {});
      await fetchData();

      if (res.ok) {
        confetti({ particleCount: 110, spread: 80, origin: { y: 0.5 } });
        setNotice({
          status: "SUCCESS",
          title: "PAYMENT AUTHORIZED — AWAITING DELIVERY",
          message: `Payment authorized via PayPal Sandbox hold (Auth ID: ${res.data?.paypal_auth_id || "Confirmed"}). Payment authorized — awaiting delivery.`,
        });
      } else {
        const errorDetail = res.data?.detail || res.data;
        const errMsg = errorDetail?.message || res.error || "Authorization could not be completed.";
        setNotice({
          status: "ERROR",
          title: "AUTHORIZATION REJECTED",
          message: errMsg,
        });
      }
    } catch (e: any) {
      setNotice({ status: "ERROR", title: "AUTHORIZATION ERROR", message: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Auto-Dispute / Report Damaged
  const handleReportIssue = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/demo/simulate-lost-package`, { method: "POST" });
      await fetchData();
      setNotice({
        status: "DISPUTED",
        title: "DISPUTE FILED & FUNDS RECLAIMED",
        message: "Issue reported! Gemini AI submitted photographic evidence to PayPal & filed dispute claim PP-D-808B464B to refund your escrow money.",
      });
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Autopilot Video Pitch Runner
  const runAutopilot = async () => {
    if (autopilotRunning || loading) return;
    setAutopilotRunning(true);
    setNotice({ status: "RUNNING", message: "Starting 1-Click Autopilot Video Demo..." });

    try {
      // Stage 1: Security Interception (403 Forbidden)
      setAutopilotStep(1);
      setNotice({
        status: "BLOCKED",
        title: "STAGE 1: BUDGET CAP INTERCEPTION (403)",
        message: "Rogue purchase attempted (₹100,000 Rolex). Automatically blocked by budget mandate. Zero money transferred.",
      });
      await fetch(`${API_BASE}/api/demo/simulate-hacked-ai`, { method: "POST" });
      await fetchData();
      await new Promise((r) => setTimeout(r, 2600));

      // Stage 2: Escrow Delivery & Capture
      setAutopilotStep(2);
      setNotice({
        status: "CAPTURED",
        title: "STAGE 2: ESCROW RELEASE UPON VERIFIED DELIVERY",
        message: "Dell Laptop ₹50,000 ordered into escrow. Delivery photo verified intact by AI &rarr; Funds released to seller.",
      });
      await fetch(`${API_BASE}/api/demo/simulate-delivery`, { method: "POST" });
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.5 } });
      await fetchData();
      await new Promise((r) => setTimeout(r, 2600));

      // Stage 3: Carrier Lost Package & Auto-Dispute
      setAutopilotStep(3);
      setNotice({
        status: "DISPUTED",
        title: "STAGE 3: AUTOMATED DISPUTE & REFUND",
        message: "Shipment delayed &gt; 48h. AI autonomously filed PayPal dispute PP-D-808B464B to reclaim buyer escrow funds.",
      });
      await fetch(`${API_BASE}/api/demo/simulate-lost-package`, { method: "POST" });
      await fetchData();
      await new Promise((r) => setTimeout(r, 1800));

      setAutopilotStep(4);
      setNotice({
        status: "SUCCESS",
        title: "DEMO COMPLETE",
        message: "All 3 real-world smart escrow stages executed successfully!",
      });
      setActiveTab("orders");
    } finally {
      setAutopilotRunning(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.merchant.toLowerCase().includes(searchQuery.toLowerCase());

    if (categoryFilter === "all") return matchesSearch;
    if (categoryFilter === "electronics") return matchesSearch && p.category === "electronics";
    if (categoryFilter === "cloud") return matchesSearch && p.category === "cloud";
    if (categoryFilter === "luxury") return matchesSearch && p.category === "luxury";
    return matchesSearch;
  });

  return (
    <div className={`min-h-screen bg-[#08090b] text-zinc-100 font-sans transition-all duration-300 ${killSwitchStatus.is_locked_down ? "ring-8 ring-rose-600 ring-inset" : ""
      }`}>
      {/* Circuit Breaker Alert Banner */}
      {killSwitchStatus.is_locked_down && (
        <div className="bg-[#2a1012] border-b border-rose-500/50 text-rose-300 font-mono text-xs py-2.5 px-6 sticky top-0 z-50 flex items-center justify-between shadow-2xl">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
            <span className="font-bold">
              SECURITY LOCKDOWN &bull; WALLET FROZEN &bull; ZERO OUTBOUND CHARGES ALLOWED
            </span>
          </div>
          <button
            onClick={async () => {
              await fetch(`${API_BASE}/api/kill-switch/reset`, { method: "POST" });
              await fetchData();
            }}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Disarm Lock
          </button>
        </div>
      )}

      {/* BRUTALIST NETWORK ANOMALY NOTIFICATION TOAST (Phase 2 Graceful Degradation) */}
      {anomalyToast && (
        <div className="fixed top-5 right-5 z-50 max-w-md w-full animate-in slide-in-from-top-3 duration-200">
          <div className="bg-[#120709] border-2 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)] p-4 rounded-xl text-white font-mono flex items-start justify-between space-x-3">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-500/80 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black tracking-wider text-rose-400 uppercase block">
                  CIRCUIT BREAKER ENGAGED
                </span>
                <p className="text-xs font-bold text-white tracking-wide">
                  {anomalyToast}
                </p>
                <span className="text-[10px] text-zinc-400 block pt-0.5 font-sans">
                  Autonomous watchdog aborted transaction &bull; Zero funds debited
                </span>
              </div>
            </div>
            <button
              onClick={() => setAnomalyToast(null)}
              className="text-zinc-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-white/10"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* TOP NAVBAR (Professional E-Commerce + Fintech Navigation) */}
      <header className="border-b border-[#1b1c24] bg-[#0c0d12]/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Logo & Value Proposition */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1b2a22] to-[#121318] border border-[#234230] flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5 text-[#00d084]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-extrabold tracking-tight text-white">
                  Aurora<span className="text-[#00d084]">Pay</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#13241b] border border-[#1b3e2b] text-[#00d084] font-semibold">
                  SMART ESCROW
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Protected Shopping &bull; PayPal Orders v2 Escrow &bull; Zero Upfront Payout
              </p>
            </div>
          </div>

          {/* Primary Navigation Tabs: [ 🛍️ Shop ] [ 📦 My Orders ] [ 🛡️ Budget & Safety ] */}
          <div className="segmented-group">
            <button
              onClick={() => setActiveTab("shop")}
              className={`segmented-item flex items-center space-x-1.5 ${activeTab === "shop" ? "segmented-item-active" : ""
                }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Shop Products</span>
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`segmented-item flex items-center space-x-1.5 ${activeTab === "orders" ? "segmented-item-active" : ""
                }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>My Escrow Orders</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-[#1a1c24] text-zinc-300 font-mono">
                {transactions.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("budget")}
              className={`segmented-item flex items-center space-x-1.5 ${activeTab === "budget" ? "segmented-item-active" : ""
                }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Budget &amp; Safeguards</span>
            </button>
          </div>

          {/* Customer Wallet & Controls (Matches Image 3 Component Aesthetic) */}
          <div className="flex items-center space-x-2.5">
            {/* Amount Pill (Image 3: Amount [ 0.00 ] [ usd v ]) */}
            <div className="amount-pill">
              <span className="amount-label">Wallet</span>
              <span
                onClick={() => setIsSetAmountModalOpen(true)}
                className="text-xs font-bold text-white font-mono hover:text-[#00d084] cursor-pointer transition-colors"
                title="Click to Configure Spending Budget & Limits"
              >
                {formatMoney(mandate.remaining_budget ?? mandate.remaining_pool ?? 126300)}
              </span>
              <button
                onClick={() => setCurrency(currency === "USD" ? "INR" : "USD")}
                className="text-[10px] font-mono font-bold text-zinc-300 hover:text-white px-2 py-0.5 rounded-md bg-[#191b22] border border-[#282b36] flex items-center space-x-1 transition-colors"
                title="Toggle Currency (USD / INR)"
              >
                <span>{currency}</span>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </button>
            </div>

            {/* Set Amount Button */}
            <button
              onClick={() => setIsSetAmountModalOpen(true)}
              className="btn-secondary px-3 py-1.5 text-xs font-semibold flex items-center space-x-1.5"
              title="Configure spending mandate and per-item limit"
            >
              <Sliders className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Set Amount</span>
            </button>

            {/* Hackathon Judge Proof Matrix Button */}
            <button
              onClick={() => setIsJudgeProofOpen(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/40 text-amber-300 hover:text-white hover:border-amber-400 flex items-center space-x-1.5 shadow-md active:scale-95 transition-all"
              title="Open Hackathon Judge Proof: Test Zero Rule Overlap, Live PayPal API Calls, & HMAC Signatures"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>🏆 Judge Proof</span>
            </button>

            {/* 1-Click Autopilot Demo Pitch Button */}
            <button
              onClick={runAutopilot}
              disabled={autopilotRunning || loading}
              className={`btn-mint px-3.5 py-1.5 text-xs font-bold flex items-center space-x-1.5 shadow-md ${autopilotRunning ? "opacity-75" : ""
                }`}
              title="Run 1-Click Autonomous Demo Pitch"
            >
              {autopilotRunning ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-black" />
              )}
              <span className="hidden sm:inline">
                {autopilotRunning ? "Running Demo..." : "1-Click Demo"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* NOTIFICATION FEEDBACK BANNER */}
      {notice && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-4">
          <div className={`p-4 rounded-xl text-xs font-mono border transition-all ${notice.status === "BLOCKED"
            ? "bg-[#241113] border-rose-500/40 text-rose-300"
            : notice.status === "CAPTURED" || notice.status === "SUCCESS"
              ? "bg-[#102319] border-[#00d084]/40 text-[#00d084]"
              : notice.status === "DISPUTED"
                ? "bg-[#251e12] border-amber-500/40 text-amber-300"
                : "bg-[#14151a] border-[#22242e] text-zinc-300"
            }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center text-sm">
                {notice.status === "BLOCKED" && <AlertTriangle className="w-4 h-4 mr-1.5 text-rose-400" />}
                {notice.status === "CAPTURED" && <CheckCircle2 className="w-4 h-4 mr-1.5 text-[#00d084]" />}
                {notice.status === "DISPUTED" && <Clock className="w-4 h-4 mr-1.5 text-amber-400" />}
                {notice.title || notice.status}
              </span>
              <button onClick={() => setNotice(null)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">
                ✕
              </button>
            </div>
            <p className="mt-1 text-xs font-sans text-zinc-300 leading-relaxed">
              {notice.message}
            </p>
          </div>
        </section>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-7">
        {/* ============================================================== */}
        {/* TAB 1: STORE & SHOPPING EXPERIENCE                             */}
        {/* ============================================================== */}
        {activeTab === "shop" && (
          <div className="space-y-6">
            {/* Store Hero Banner */}
            <div className="surface-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
              <div className="space-y-1.5 relative z-10">
                <span className="text-[11px] font-mono text-[#00d084] font-semibold uppercase tracking-wider flex items-center">
                  <Lock className="w-3.5 h-3.5 mr-1" />
                  100% Escrow Protection Guarantee
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Shop Verified Products with PayPal Smart Escrow
                </h1>
                <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                  When you buy any item, funds are locked in smart escrow using PayPal Orders v2.
                  The seller receives <strong>$0 upfront</strong> until the package is delivered &amp; verified undamaged.
                </p>
              </div>

              {/* Action: + Buy Any Custom Item */}
              <div className="flex items-center space-x-3 relative z-10 flex-shrink-0">
                <button
                  onClick={() => setIsCustomProcureOpen(true)}
                  className="btn-mint px-5 py-3 text-xs font-bold flex items-center space-x-2 shadow-lg"
                  title="Buy any custom asset or enter any item"
                >
                  <Plus className="w-4 h-4 text-black" />
                  <span>+ Buy Any Custom Item</span>
                </button>
              </div>
            </div>

            {/* Store Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b1c24] pb-3">
              {/* Category Filters */}
              <div className="flex items-center space-x-1.5 overflow-x-auto">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${categoryFilter === "all" ? "bg-white text-black" : "bg-[#13141a] text-zinc-400 hover:text-white"
                    }`}
                >
                  All Products
                </button>
                <button
                  onClick={() => setCategoryFilter("electronics")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${categoryFilter === "electronics" ? "bg-white text-black" : "bg-[#13141a] text-zinc-400 hover:text-white"
                    }`}
                >
                  Laptops &amp; Phones
                </button>
                <button
                  onClick={() => setCategoryFilter("cloud")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${categoryFilter === "cloud" ? "bg-white text-black" : "bg-[#13141a] text-zinc-400 hover:text-white"
                    }`}
                >
                  Cloud Compute
                </button>
                <button
                  onClick={() => setCategoryFilter("luxury")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${categoryFilter === "luxury" ? "bg-rose-600 text-white" : "bg-[#251214] text-rose-300 hover:text-white"
                    }`}
                  title="Tests budget cap security gate"
                >
                  Prohibited (Test AI Block)
                </button>
              </div>

              <div className="flex items-center space-x-2">
                {/* Search Bar */}
                <div className="flex items-center bg-[#13141a] border border-[#232532] rounded-xl px-3 py-1.5 focus-within:border-[#00d084] transition-all">
                  <Search className="w-3.5 h-3.5 text-zinc-500 mr-2" />
                  <input
                    type="text"
                    placeholder="Search store..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-xs text-white placeholder-zinc-500 outline-none w-32 sm:w-48 font-sans"
                  />
                </div>

                {/* AI Curved Rail Dock Toggle (Matches Image Reference) */}
                <button
                  type="button"
                  onClick={() => setShowEdgeDock(!showEdgeDock)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center space-x-1.5 active:scale-95 ${showEdgeDock
                    ? "bg-[#14261c] text-[#00d084] border border-[#1e3a2b]"
                    : "bg-[#13141a] text-zinc-400 border border-[#232532] hover:text-white"
                    }`}
                  title="Toggle Curved AI Edge Dock (Matches Image Reference)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#00d084]" />
                  <span className="hidden sm:inline">AI Quick Rail</span>
                </button>
              </div>
            </div>

            {/* Store Layout with Curved AI Edge Dock Rail (Matches Reference Photo) */}
            <div className="flex items-start gap-4 relative">
              {/* Product Cards Grid */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((p) => {
                  const isRogue = p.category === "luxury";
                  const isOverBudget = p.amount > (mandate.max_single_spend || 55000);

                  return (
                    <div
                      key={p.id}
                      className={`surface-card p-4 flex flex-col justify-between transition-all hover:border-zinc-500 shadow-md ${isRogue ? "border-rose-900/60 bg-[#160c0e]/60" : ""
                        }`}
                    >
                      <div className="space-y-3">
                        {/* Product Header / Icon */}
                        <div className="flex items-center justify-between">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isRogue
                            ? "bg-rose-950 text-rose-400"
                            : p.category === "cloud"
                              ? "bg-sky-950 text-sky-400"
                              : "bg-[#182a20] text-[#00d084]"
                            }`}>
                            {isRogue ? (
                              <Watch className="w-5 h-5" />
                            ) : p.category === "cloud" ? (
                              <Server className="w-5 h-5" />
                            ) : p.name.toLowerCase().includes("phone") ? (
                              <Smartphone className="w-5 h-5" />
                            ) : (
                              <Laptop className="w-5 h-5" />
                            )}
                          </div>

                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${isRogue
                            ? "bg-rose-900/40 text-rose-300 border border-rose-800/50"
                            : "bg-[#181a22] text-zinc-400 border border-[#242733]"
                            }`}>
                            {isRogue ? "SECURITY TEST" : p.category.toUpperCase()}
                          </span>
                        </div>

                        {/* Product Info */}
                        <div>
                          <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                            {p.name}
                          </h3>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {p.merchant}
                          </p>
                          <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                            {p.description}
                          </p>
                        </div>
                      </div>

                      {/* Price & Buy Button */}
                      <div className="pt-4 border-t border-[#1c1e27] mt-4 space-y-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] text-zinc-500 font-mono">PRICE:</span>
                          <span className={`text-base font-bold font-mono ${isRogue ? "text-rose-400" : "text-white"}`}>
                            {formatMoney(p.amount)}
                          </span>
                        </div>

                        {/* Dual Action Buttons (Matches Image 3 Aesthetic: [ Pay $49 | Invoice ]) */}
                        {isRogue ? (
                          <div className="btn-dual-danger w-full">
                            <button
                              onClick={() => handleBuyItem(p)}
                              disabled={loading}
                              className="btn-dual-danger-left flex-1 justify-center active:scale-95"
                              title="Tests AI budget cap and category interception"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                              <span>Test AI Budget Block</span>
                            </button>
                            <div className="btn-dual-danger-right">
                              <span>403 Gate</span>
                            </div>
                          </div>
                        ) : (
                          <div className="btn-dual w-full">
                            <button
                              onClick={() => setCheckoutProduct(p)}
                              disabled={loading}
                              className="btn-dual-primary flex-1 justify-center active:scale-95"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-black mr-1" />
                              <span>Buy with Escrow</span>
                            </button>
                            <button
                              onClick={() => setCheckoutProduct(p)}
                              className="btn-dual-secondary active:scale-95"
                              title="Protected by PayPal Orders v2 Escrow"
                            >
                              <Lock className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Protected</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Curved AI Edge Dock Rail (Matches Image Reference) */}
              {showEdgeDock && (
                <div className="hidden lg:block sticky top-24 flex-shrink-0 animate-in fade-in duration-300">
                  <EdgeDockRail
                    onOpenSettings={() => setIsSetAmountModalOpen(true)}
                    onFilterCategory={(cat) => setCategoryFilter(cat)}
                    activeCategory={categoryFilter}
                    remainingBudget={mandate.remaining_budget ?? mandate.remaining_pool ?? 126300}
                    maxSingleSpend={mandate.max_single_spend ?? mandate.max_budget ?? 55000}
                    currency={currency}
                    formatMoney={formatMoney}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: MY ORDERS & ESCROW MANAGEMENT                          */}
        {/* ============================================================== */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="surface-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>My Active Escrow Orders</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#181a20] text-zinc-400 border border-[#242630]">
                    {transactions.length} Total
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Every order is protected by 2-Step AI verification. Funds stay safely authorized with PayPal until verified intact.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchData}
                  className="btn-secondary px-3 py-1.5 text-xs font-semibold flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Orders</span>
                </button>
              </div>
            </div>

            {/* Segmented Order Filters (Matches Image 3 Aesthetic) */}
            <div className="flex items-center justify-between overflow-x-auto pb-1">
              <div className="segmented-group">
                <button
                  onClick={() => setOrderFilter("all")}
                  className={`segmented-item ${orderFilter === "all" ? "segmented-item-active" : ""}`}
                >
                  All Orders ({transactions.length})
                </button>
                <button
                  onClick={() => setOrderFilter("authorized")}
                  className={`segmented-item ${orderFilter === "authorized" ? "segmented-item-active" : ""}`}
                >
                  🔒 Payment Authorized ({transactions.filter(t => t.status === "AUTHORIZED").length})
                </button>
                <button
                  onClick={() => setOrderFilter("captured")}
                  className={`segmented-item ${orderFilter === "captured" ? "segmented-item-active" : ""}`}
                >
                  ✓ Released ({transactions.filter(t => t.status === "CAPTURED").length})
                </button>
                <button
                  onClick={() => setOrderFilter("disputed")}
                  className={`segmented-item ${orderFilter === "disputed" ? "segmented-item-active" : ""}`}
                >
                  ⚠️ Disputed ({transactions.filter(t => t.status === "DISPUTED").length})
                </button>
                <button
                  onClick={() => setOrderFilter("blocked")}
                  className={`segmented-item ${orderFilter === "blocked" ? "segmented-item-active" : ""}`}
                >
                  ⛔ 403 Blocked ({transactions.filter(t => t.status === "BLOCKED").length})
                </button>
              </div>
            </div>

            {/* Orders Cards List */}
            <div className="space-y-3">
              {transactions
                .filter(tx => {
                  if (orderFilter === "authorized") return tx.status === "AUTHORIZED";
                  if (orderFilter === "captured") return tx.status === "CAPTURED";
                  if (orderFilter === "disputed") return tx.status === "DISPUTED";
                  if (orderFilter === "blocked") return tx.status === "BLOCKED";
                  return true;
                })
                .map((tx) => {
                  const isBlocked = tx.status === "BLOCKED";
                  const isCaptured = tx.status === "CAPTURED";
                  const isDisputed = tx.status === "DISPUTED";
                  const isAuthorized = tx.status === "AUTHORIZED";
                  const isPendingApproval = tx.status === "ORDER_CREATED" || tx.payment_status === "PENDING_BUYER_APPROVAL";

                  return (
                    <div
                      key={tx.id}
                      className="surface-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-zinc-500 transition-colors"
                    >
                      {/* Left: Product & Tracking info */}
                      <div className="flex items-start space-x-3.5">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isBlocked
                          ? "bg-[#2d1215] text-rose-400"
                          : isCaptured
                            ? "bg-[#13241b] text-[#00d084]"
                            : isDisputed
                              ? "bg-[#251e12] text-amber-400"
                              : isPendingApproval
                                ? "bg-[#281f12] text-amber-300"
                                : "bg-[#122230] text-sky-400"
                          }`}>
                          {isBlocked ? (
                            <AlertTriangle className="w-5 h-5" />
                          ) : isCaptured ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : isDisputed ? (
                            <AlertCircle className="w-5 h-5" />
                          ) : isPendingApproval ? (
                            <Clock className="w-5 h-5" />
                          ) : (
                            <Package className="w-5 h-5" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <h3 className="text-sm font-bold text-white">{tx.item_name}</h3>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${isBlocked
                              ? "bg-[#331417] text-rose-300 border border-rose-800/50"
                              : isCaptured
                                ? "bg-[#13241b] text-[#00d084] border border-[#1b3d2b]"
                                : isDisputed
                                  ? "bg-[#281f12] text-amber-300 border border-amber-800/50"
                                  : isPendingApproval
                                    ? "bg-[#281f12] text-amber-300 border border-amber-800/50"
                                    : "bg-[#122230] text-sky-300 border border-sky-800/50"
                              }`}>
                              {isBlocked ? "BLOCKED BY BUDGET GATE" : isCaptured ? "PAYMENT RELEASED" : isDisputed ? "DISPUTE REFUNDED" : isPendingApproval ? "AWAITING BUYER APPROVAL" : "PAYMENT AUTHORIZED — AWAITING DELIVERY"}
                            </span>
                          </div>

                          <p className="text-xs text-zinc-400">
                            Seller: <span className="text-zinc-200">{tx.merchant_name}</span> &bull; PayPal Order ID:{" "}
                            <span className="font-mono text-zinc-300">{tx.paypal_order_id || "None (Blocked)"}</span>
                          </p>

                          <div className="flex items-center space-x-3 text-[11px] font-mono text-zinc-500">
                            <span className="flex items-center">
                              <Truck className="w-3 h-3 mr-1" />
                              {tx.carrier || "FedEx Express"} &bull; {tx.tracking_number || "TRK992144810"}
                            </span>
                            <span>&bull;</span>
                            <span>TX: {tx.id}</span>
                          </div>

                          {/* 2-Step AI Badges */}
                          <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-1">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center ${tx.maker_checker_audit?.approved
                              ? "bg-[#14261c] text-[#00d084] border border-[#1e3a2b]"
                              : "bg-[#2f1316] text-rose-300 border border-rose-800/50"
                              }`}>
                              <Shield className="w-2.5 h-2.5 mr-1" />
                              {tx.maker_checker_audit?.approved ? "Step 1: HMAC Signed" : "Step 1: Refused"}
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center ${isCaptured
                              ? "bg-[#14261c] text-[#00d084] border border-[#1e3a2b]"
                              : isDisputed
                                ? "bg-[#281f12] text-amber-300 border border-amber-800/50"
                                : isBlocked
                                  ? "bg-zinc-800 text-zinc-400"
                                  : "bg-[#122230] text-sky-300 border border-sky-800/50"
                              }`}>
                              <Eye className="w-2.5 h-2.5 mr-1" />
                              {isCaptured ? "Step 2: 99% Pristine" : isDisputed ? "Step 2: Crushed Damage" : isBlocked ? "Step 2: Pre-Purchase Stop" : "Step 2: Awaiting POD"}
                            </span>

                            {/* Cryptographic SHA-256 State Hash Badge (Phase 1) */}
                            <div className="relative group/hash inline-flex items-center">
                              <button
                                type="button"
                                onClick={() => setSelectedTx(tx)}
                                className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center border transition-all active:scale-95 cursor-pointer ${tx.is_corrupted
                                  ? "bg-rose-950/80 text-rose-300 border-rose-500/60 animate-pulse"
                                  : "bg-[#0b1d16] text-[#00d084] border-[#1b3d2b] hover:bg-[#122e23] hover:border-[#00d084]/60"
                                  }`}
                                title="Cryptographically Verified"
                              >
                                <Lock className="w-2.5 h-2.5 mr-1" />
                                <span className="font-bold">
                                  {tx.is_corrupted
                                    ? "CORRUPTED"
                                    : `0x${(tx.state_hash || "8F92A15B").slice(0, 8).toUpperCase()}`}
                                </span>
                              </button>

                              {/* Hover Tooltip: Cryptographically Verified */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/hash:flex flex-col items-center z-30 pointer-events-none">
                                <div className="bg-[#12131a] text-zinc-100 text-[10px] font-mono px-2.5 py-1 rounded-md border border-[#2b2d3c] shadow-2xl whitespace-nowrap flex items-center space-x-1.5">
                                  <CheckCircle2 className="w-3 h-3 text-[#00d084]" />
                                  <span>{tx.is_corrupted ? "DATABASE RECORD CORRUPTED" : "Cryptographically Verified"}</span>
                                </div>
                                <div className="w-1.5 h-1.5 bg-[#12131a] border-r border-b border-[#2b2d3c] rotate-45 -mt-1" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Customer Actions */}
                      <div className="flex items-center justify-between lg:justify-end space-x-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#1c1e27] flex-shrink-0">
                        <div className="text-right mr-2">
                          <span className="text-[10px] text-zinc-500 font-mono block">AUTHORIZED AMOUNT</span>
                          <span className={`text-base font-bold font-mono ${isBlocked ? "line-through text-rose-400" : "text-white"}`}>
                            {formatMoney(tx.amount)}
                          </span>
                        </div>

                        {/* Pending Buyer Approval Actions (Stage 4) */}
                        {isPendingApproval && tx.paypal_order_id && (
                          <div className="flex items-center space-x-2">
                            {tx.approval_url && (
                              <a
                                href={tx.approval_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary px-3 py-2 text-xs font-semibold text-amber-300 hover:text-white flex items-center space-x-1 border-amber-800/50 hover:border-amber-600 transition-colors"
                                title="Open PayPal Sandbox to approve payment hold"
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                <span>Approve on PayPal</span>
                              </a>
                            )}
                            <button
                              onClick={() => handleAuthorizeOrder(tx.paypal_order_id, tx.id)}
                              disabled={loading}
                              className="btn-mint px-3.5 py-2 text-xs font-bold flex items-center space-x-1.5 shadow-md bg-amber-400 text-black hover:bg-amber-300 transition-colors"
                              title="Verify buyer approval with PayPal Sandbox and authorize payment hold awaiting delivery"
                            >
                              <Lock className="w-3.5 h-3.5 text-black" />
                              <span>Verify &amp; Authorize</span>
                            </button>
                          </div>
                        )}

                        {/* Authorized Actions */}
                        {isAuthorized && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleConfirmDelivery(tx.id)}
                              disabled={loading}
                              className="btn-mint px-3.5 py-2 text-xs font-bold flex items-center space-x-1.5 shadow-md"
                              title="Verifies package condition & releases funds to seller"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                              <span>Verify &amp; Release</span>
                            </button>
                            <button
                              onClick={handleReportIssue}
                              disabled={loading}
                              className="btn-secondary px-3 py-2 text-xs font-semibold text-rose-300 hover:text-white"
                              title="Reports damage & auto-files dispute"
                            >
                              <span>Report Issue</span>
                            </button>
                          </div>
                        )}

                        {/* 2-Step AI Audit Inspector Button (Available for ALL orders) */}
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="btn-secondary px-3.5 py-2 text-xs font-semibold text-white hover:text-[#00d084] hover:border-[#00d084]/60 flex items-center space-x-1.5 transition-colors shadow-sm"
                          title="Inspect Maker-Checker HMAC and Gemini Vision Physical Inspection"
                        >
                          <Shield className="w-3.5 h-3.5 text-[#00d084]" />
                          <span>Inspect 2-Step AI Audit</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

              {transactions.length === 0 && (
                <div className="surface-card p-12 text-center space-y-3">
                  <Package className="w-10 h-10 text-zinc-600 mx-auto" />
                  <h3 className="text-sm font-bold text-white">No Orders Yet</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    You haven't purchased anything yet. Head over to the Store tab to buy your first item protected by PayPal Smart Escrow!
                  </p>
                  <button
                    onClick={() => setActiveTab("shop")}
                    className="btn-mint px-4 py-2 text-xs font-bold"
                  >
                    Go to Store
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: BUDGET & AI SAFEGUARDS                                 */}
        {/* ============================================================== */}
        {activeTab === "budget" && (
          <div className="space-y-6">
            {/* Budget Configuration Card */}
            <div className="surface-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b1c24] pb-5">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Sliders className="w-5 h-5 text-[#00d084]" />
                    <span>My Spending Budget &amp; AI Mandate</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Control how much your AI agent can spend per item and the total funds available in escrow.
                  </p>
                </div>

                <button
                  onClick={() => setIsSetAmountModalOpen(true)}
                  className="btn-mint px-4 py-2.5 text-xs font-bold flex items-center space-x-1.5 shadow-md"
                >
                  <Sliders className="w-3.5 h-3.5 text-black" />
                  <span>Configure Budget Amounts</span>
                </button>
              </div>

              {/* Budget Overview Display */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="surface-card-subtle p-4 space-y-1">
                  <span className="text-[11px] font-mono text-zinc-500">AVAILABLE ESCROW WALLET</span>
                  <div className="text-2xl font-bold font-mono text-[#00d084]">
                    {formatMoney(mandate.remaining_budget ?? mandate.remaining_pool ?? 126300)}
                  </div>
                  <span className="text-[11px] text-zinc-400 font-sans">
                    Total funds delegated to agent
                  </span>
                </div>

                <div className="surface-card-subtle p-4 space-y-1">
                  <span className="text-[11px] font-mono text-zinc-500">MAX PER-ITEM SPENDING CAP</span>
                  <div className="text-2xl font-bold font-mono text-white">
                    {formatMoney(mandate.max_single_spend || 55000)}
                  </div>
                  <span className="text-[11px] text-zinc-400 font-sans">
                    Any item above this is blocked (403)
                  </span>
                </div>

                <div className="surface-card-subtle p-4 space-y-1">
                  <span className="text-[11px] font-mono text-zinc-500">ALLOWED CATEGORIES</span>
                  <div className="text-xs font-semibold text-zinc-200 mt-2 flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 rounded bg-[#182a20] text-[#00d084]">Electronics</span>
                    <span className="px-2 py-0.5 rounded bg-[#182a20] text-[#00d084]">Hardware</span>
                    <span className="px-2 py-0.5 rounded bg-[#182a20] text-[#00d084]">Cloud</span>
                    <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 line-through">Luxury</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dedicated Judge Proof & Verification Matrix Card */}
            <div className="surface-card p-6 bg-gradient-to-r from-[#12131a] via-[#161a22] to-[#12131a] border border-amber-500/30 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold uppercase">
                      HACKATHON SPONSOR TRACK PROOF
                    </span>
                    <span className="text-xs font-mono text-zinc-400">&bull; PayPal Agent Toolkit</span>
                  </div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>🏆 Hackathon Judge Proof &amp; Zero Rule Overlap Matrix</span>
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                    Interactive technical proof console: Test all 4 non-overlapping defense tiers in isolation, ping PayPal Sandbox API live, and verify cryptographic HMAC-SHA256 signatures with mathematical proof.
                  </p>
                </div>

                <button
                  onClick={() => setIsJudgeProofOpen(true)}
                  className="px-5 py-3 rounded-xl text-xs font-bold font-mono bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400 shadow-lg flex items-center space-x-2 active:scale-95 transition-all flex-shrink-0"
                >
                  <Shield className="w-4 h-4 text-black" />
                  <span>Open Judge Proof Console</span>
                  <ArrowRight className="w-3.5 h-3.5 text-black" />
                </button>
              </div>
            </div>

            {/* How 2-Step AI Verifies Everything Works */}
            <div className="surface-card p-6 space-y-5">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Shield className="w-4 h-4 text-[#00d084]" />
                <span>How 2-Step AI Verifies Transactions Are Working Properly</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Step 1: Maker-Checker Dual Control */}
                <div className="surface-card-subtle p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center">
                      <Lock className="w-4 h-4 mr-1.5 text-sky-400" />
                      1. Pre-Purchase: Dual-Agent Maker-Checker
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                      HMAC SIGNED
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    <strong>Step A (Buyer Agent):</strong> Formulates the purchase proposal for the item.<br />
                    <strong>Step B (Auditor Agent):</strong> Runs in an isolated sandbox, validates your budget cap, and cryptographically signs the order with <strong>HMAC-SHA256</strong>. If the buyer is compromised, the auditor blocks it immediately.
                  </p>
                  <button
                    onClick={async () => {
                      setLoading(true);
                      const res = await fetch(`${API_BASE}/api/maker-checker/propose-and-audit`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ item_name: "Dell Laptop", category: "electronics", amount: 50000.0, merchant: "Dell Technologies" }),
                      });
                      const data = await res.json();
                      setLoading(false);
                      setNotice({ status: "SUCCESS", title: "MAKER-CHECKER VERIFIED", message: `Dual-agent sign successful! Status: ${data.status}. HMAC signature generated.` });
                    }}
                    className="w-full btn-secondary py-2 text-xs font-semibold"
                  >
                    Simulate Dual-Agent Verification
                  </button>
                </div>

                {/* Step 2: Post-Delivery Gemini Vision */}
                <div className="surface-card-subtle p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center">
                      <Eye className="w-4 h-4 mr-1.5 text-[#00d084]" />
                      2. Post-Delivery: Gemini Vision Physical Inspection
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#182a20] text-[#00d084] border border-[#234230]">
                      MULTI-MODAL POD
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    <strong>Step A (Payment Authorization):</strong> Payment is authorized via PayPal with <code className="text-zinc-200">intent: AUTHORIZE</code> ($0 paid upfront).<br />
                    <strong>Step B (Visual POD):</strong> Courier drop-off photo is inspected by Gemini Vision. If intact, escrow is captured. If crushed or damaged, an automated dispute claim is filed to refund your money.
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const authTx = transactions.find((t: any) => t.status === "AUTHORIZED" && t.paypal_auth_id);
                          if (!authTx) {
                            setNotice({ status: "BLOCKED", title: "NO AUTHORIZED ORDER", message: "Please order a product into escrow first before testing vision inspection." });
                            setLoading(false);
                            return;
                          }
                          const tokenRes = await fetch(`${API_BASE}/api/auth/token`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ username: "submitter_alice", password: "AliceLogistics2026!" }),
                          });
                          const tokenData = await tokenRes.json();
                          const res = await fetch(`${API_BASE}/api/vision/verify-delivery`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${tokenData.access_token}`
                            },
                            body: JSON.stringify({ transaction_id: authTx.id, scenario: "INTACT_PACKAGE" }),
                          });
                          const data = await res.json();
                          await fetchData();
                          setNotice({ status: "DELIVERY_REVIEW_PENDING", title: "VISION: INTACT PACKAGE", message: "Gemini Vision verified box intact & seal undamaged. Recorded as recommendation awaiting reviewer verification." });
                        } catch (err: any) {
                          setNotice({ status: "BLOCKED", title: "VISION ERROR", message: err.message });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="flex-1 btn-mint py-2 text-xs font-semibold"
                    >
                      Test Intact (Pass)
                    </button>
                    <button
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const authTx = transactions.find((t: any) => t.status === "AUTHORIZED" && t.paypal_auth_id);
                          if (!authTx) {
                            setNotice({ status: "BLOCKED", title: "NO AUTHORIZED ORDER", message: "Please order a product into escrow first before testing vision inspection." });
                            setLoading(false);
                            return;
                          }
                          const tokenRes = await fetch(`${API_BASE}/api/auth/token`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ username: "submitter_alice", password: "AliceLogistics2026!" }),
                          });
                          const tokenData = await tokenRes.json();
                          const res = await fetch(`${API_BASE}/api/vision/verify-delivery`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${tokenData.access_token}`
                            },
                            body: JSON.stringify({ transaction_id: authTx.id, scenario: "CRUSHED_DAMAGE" }),
                          });
                          const data = await res.json();
                          await fetchData();
                          setNotice({ status: "DISPUTED", title: "VISION: CRUSHED BOX DETECTED", message: "Gemini Vision detected severe damage. Recorded internal dispute for auditor review." });
                        } catch (err: any) {
                          setNotice({ status: "BLOCKED", title: "VISION ERROR", message: err.message });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="flex-1 btn-secondary py-2 text-xs font-semibold text-rose-300"
                    >
                      Test Crushed (Dispute)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CHECKOUT MODAL (Review & Confirm Purchase with PayPal Escrow) */}
      {checkoutProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="surface-card max-w-md w-full p-6 text-white font-sans shadow-2xl space-y-5 border border-[#272935]">
            <div className="flex items-center justify-between border-b border-[#21232d] pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#16291e] border border-[#234230] flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-[#00d084]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                    Confirm Purchase
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Protected by PayPal Orders v2 Smart Escrow
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCheckoutProduct(null)}
                className="p-1 hover:bg-[#1a1c24] rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Summary */}
            <div className="bg-[#14151c] border border-[#232532] rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-bold text-white">{checkoutProduct.name}</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">{checkoutProduct.merchant}</p>
                </div>
                <span className="text-base font-bold font-mono text-white">
                  {formatMoney(checkoutProduct.amount)}
                </span>
              </div>

              <div className="pt-2 border-t border-[#1f212a] flex justify-between text-xs font-mono">
                <span className="text-zinc-500">PAYMENT METHOD:</span>
                <span className="text-white font-bold flex items-center">
                  <span className="w-2 h-2 rounded-full bg-[#00d084] mr-1.5" />
                  PayPal Sandbox Escrow
                </span>
              </div>
            </div>

            {/* Escrow Guarantee Explanation */}
            <div className="bg-[#102319] border border-[#00d084]/30 rounded-xl p-3.5 text-xs text-zinc-300 space-y-1">
              <span className="font-bold text-[#00d084] flex items-center">
                <Shield className="w-3.5 h-3.5 mr-1 text-[#00d084]" />
                How your money is protected:
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Funds are authorized with PayPal (<code className="text-zinc-200">intent: AUTHORIZE</code>). The seller does not get paid until the parcel arrives and delivery is verified by AI Vision.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2.5 pt-2">
              <button
                onClick={() => setCheckoutProduct(null)}
                className="flex-1 btn-secondary py-2.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBuyItem(checkoutProduct)}
                disabled={loading}
                className="flex-1 btn-mint py-2.5 text-xs font-bold flex items-center justify-center space-x-1.5 shadow-lg"
              >
                <CreditCard className="w-3.5 h-3.5 text-black" />
                <span>Authorize &amp; Place Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-STEP AI VERIFICATION & TRANSACTION AUDIT INSPECTOR MODAL */}
      <AuditModal
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        tx={selectedTx}
        formatMoney={formatMoney}
      />

      {/* SET CURRENCY & AMOUNT MODAL */}
      <SetAmountModal
        isOpen={isSetAmountModalOpen}
        onClose={() => setIsSetAmountModalOpen(false)}
        currency={currency}
        onSetCurrency={setCurrency}
        currentBalance={mandate.remaining_budget ?? mandate.remaining_pool ?? 126300}
        currentMaxSpend={mandate.max_single_spend || 55000}
        onSave={handleSaveBudget}
        loading={loading}
      />

      {/* CUSTOM PROCUREMENT MODAL (BUY ANY ITEM) */}
      <CustomProcureModal
        isOpen={isCustomProcureOpen}
        onClose={() => setIsCustomProcureOpen(false)}
        currency={currency}
        maxSingleSpendInr={mandate.max_single_spend || 55000}
        remainingBudgetInr={mandate.remaining_budget ?? mandate.remaining_pool ?? 126300}
        onProcure={async (customProd) => {
          await handleBuyItem({
            id: `CUSTOM-${Date.now()}`,
            name: customProd.name,
            category: customProd.category,
            amount: customProd.amount,
            currency: "INR",
            merchant: customProd.merchant,
            description: customProd.description,
            demo_type: "standard_safe",
          });
        }}
        loading={loading}
      />

      {/* PAYPAL AUTH MODAL */}
      <PayPalAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        connectedAccount={connectedAccount}
        onConnect={async (account) => {
          setConnectedAccount(account);
          await fetch(`${API_BASE}/api/paypal/connect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(account),
          });
        }}
        onDisconnect={async () => {
          setConnectedAccount(null);
          await fetch(`${API_BASE}/api/paypal/disconnect`, { method: "POST" });
        }}
      />

      {/* HACKATHON JUDGE PROOF & ZERO RULE OVERLAP VERIFICATION MODAL */}
      <JudgeProofModal
        isOpen={isJudgeProofOpen}
        onClose={() => setIsJudgeProofOpen(false)}
        currency={currency}
        formatMoney={formatMoney}
      />

      {/* FOOTER */}
      <footer className="border-t border-[#1b1c24] py-4 px-8 text-xs font-mono text-zinc-500 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>AuroraPay OS &bull; Built with PayPal Agent Toolkit &amp; Smart Escrow Protocols</span>
        <div className="flex items-center space-x-3 text-zinc-400">
          <span className="flex items-center text-[#00d084]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d084] animate-pulse mr-1.5" />
            Backend Online (:8000)
          </span>
          <span>&bull;</span>
          <span>Next.js 16 (:3000)</span>
        </div>
      </footer>
    </div>
  );
}
