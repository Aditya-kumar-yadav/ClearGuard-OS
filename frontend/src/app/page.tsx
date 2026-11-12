"use client";

import React, { useEffect, useState } from "react";
import {
  Shield,
  ShoppingBag,
  Camera,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Lock,
  Eye,
  Zap,
  Sparkles,
  Laptop,
  Smartphone,
  Server,
  Watch,
  Upload,
  CreditCard,
  SlidersHorizontal,
  X,
  Check,
  ShieldAlert,
  ArrowRight,
  Wallet,
  Activity,
  FileCheck2,
  Loader2,
  Cpu,
  Briefcase,
  Trash2,
  LayoutGrid,
  Table2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Product } from "@/components/ProductCatalog";
import { PayPalAuthModal } from "@/components/PayPalAuthModal";
import { SetAmountModal } from "@/components/SetAmountModal";
import { CustomProcureModal } from "@/components/CustomProcureModal";
import { AuditModal } from "@/components/AuditModal";
import { SettlementFlowModal, SettlementFlowState } from "@/components/SettlementFlowModal";
import { EdgeDockRail } from "@/components/EdgeDockRail";
import { TransactionsAgGrid } from "@/components/TransactionsAgGrid";
import { PayPalLogo, VisionLensLogo, AuroraShieldLogo } from "@/components/BrandLogos";
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
    description: "Corporate rugged workstation for distributed engineering teams",
    demo_type: "auto_dispute",
  },
  {
    id: "PROD-004",
    name: "Rolex Submariner Luxury Watch",
    category: "luxury",
    amount: 100000.0,
    currency: "INR",
    merchant: "Swiss Chrono Vault Dealers",
    description: "High-value luxury asset used to verify OpenGuardrails blocking",
    demo_type: "rogue_ai_attack",
  },
  {
    id: "PROD-005",
    name: "AWS Enterprise GPU Compute Credits",
    category: "cloud",
    amount: 12000.0,
    currency: "INR",
    merchant: "Amazon Web Services India",
    description: "High-performance GPU inference cloud compute quota",
    demo_type: "standard_safe",
  },
  {
    id: "PROD-006",
    name: "Dell UltraSharp 27-inch 4K USB-C Monitor",
    category: "electronics",
    amount: 38500.0,
    currency: "INR",
    merchant: "Dell Direct B2B",
    description: "4K IPS hub monitor with 90W USB-C power delivery for workstation setups",
    demo_type: "escrow_delivery",
  },
  {
    id: "PROD-007",
    name: "Apple Magic Trackpad & Studio Mic Bundle",
    category: "electronics",
    amount: 24500.0,
    currency: "INR",
    merchant: "Apple Commercial Direct",
    description: "Studio audio & multi-touch desktop control kit for product design teams",
    demo_type: "standard_safe",
  },
  {
    id: "PROD-008",
    name: "Sony WH-1000XM5 Enterprise Headset",
    category: "electronics",
    amount: 26900.0,
    currency: "INR",
    merchant: "Sony Enterprise India",
    description: "Active noise-cancelling conference headset for distributed engineering calls",
    demo_type: "standard_safe",
  },
  {
    id: "PROD-009",
    name: "Keychron Q1 Pro Wireless Mechanical Keyboard",
    category: "hardware",
    amount: 16500.0,
    currency: "INR",
    merchant: "Keychron India",
    description: "CNC aluminum QMK/VIA wireless mechanical keyboard for developers",
    demo_type: "standard_safe",
  },
  {
    id: "PROD-010",
    name: "CalDigit TS4 Thunderbolt 4 Pro Dock",
    category: "hardware",
    amount: 29500.0,
    currency: "INR",
    merchant: "CalDigit Enterprise",
    description: "18-port Thunderbolt 4 connectivity hub with 98W host charging",
    demo_type: "standard_safe",
  },
  {
    id: "PROD-011",
    name: "Samsung 990 PRO 2TB NVMe SSD Pack",
    category: "hardware",
    amount: 18200.0,
    currency: "INR",
    merchant: "Samsung Semiconductor",
    description: "High-speed PCIe 4.0 NVMe workstation storage upgrade kit",
    demo_type: "standard_safe",
  },
  {
    id: "PROD-012",
    name: "Google Cloud Vertex AI & Gemini Quota Pack",
    category: "cloud",
    amount: 22000.0,
    currency: "INR",
    merchant: "Google Cloud Billing",
    description: "Dedicated multimodal Vision & LLM API inference capacity credits",
    demo_type: "standard_safe",
  },
  {
    id: "PROD-013",
    name: "Ergonomic LED Task Lamp & Aluminum Stand",
    category: "office",
    amount: 14500.0,
    currency: "INR",
    merchant: "Workspace Studio India",
    description: "Precision desk lighting and anodized riser for dual-monitor desks",
    demo_type: "standard_safe",
  },
  {
    id: "PROD-014",
    name: "Logitech MX Master 3S & Brio 4K Kit",
    category: "office",
    amount: 19800.0,
    currency: "INR",
    merchant: "Logitech B2B Direct",
    description: "Executive ergonomic mouse and 4K HDR webcam conference bundle",
    demo_type: "standard_safe",
  },
];

type NavSection = "overview" | "orders" | "vision" | "settings";

export default function Home() {
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");
  const [activeTab, setActiveTab] = useState<NavSection>("overview");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "authorized" | "captured" | "disputed" | "blocked">("all");
  const [orderViewMode, setOrderViewMode] = useState<"cards" | "grid">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSetAmountModalOpen, setIsSetAmountModalOpen] = useState(false);
  const [isCustomProcureOpen, setIsCustomProcureOpen] = useState(false);
  const [isEdgeBuyOpen, setIsEdgeBuyOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [selectedTxTab, setSelectedTxTab] = useState<"hash_chain" | "maker_checker" | "vision" | "paypal">("hash_chain");
  const [settlementFlow, setSettlementFlow] = useState<SettlementFlowState | null>(null);
  const openTxInspector = (tx: any, tab: "hash_chain" | "maker_checker" | "vision" | "paypal" = "hash_chain") => {
    setIsEdgeBuyOpen(false);
    setSelectedTxTab(tab);
    setSelectedTx(tx);
  };

  const hasOpenModal = Boolean(
    isAuthModalOpen || isSetAmountModalOpen || isCustomProcureOpen || checkoutProduct || selectedTx || settlementFlow?.isOpen
  );

  // Never allow floating Edge AI drawer to overlap an open modal, and lock background scroll while an overlay is open
  useEffect(() => {
    if (hasOpenModal && isEdgeBuyOpen) {
      setIsEdgeBuyOpen(false);
    }
  }, [hasOpenModal, isEdgeBuyOpen]);

  useEffect(() => {
    if (hasOpenModal || isEdgeBuyOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [hasOpenModal, isEdgeBuyOpen]);

  // Status Notifications
  const [notice, setNotice] = useState<any>(null);
  const [anomalyToast, setAnomalyToast] = useState<string | null>(null);

  // Live Backend Health & Integration Status
  const [backendHealth, setBackendHealth] = useState<{
    status: "CHECKING" | "ONLINE" | "OFFLINE";
    paypal_configured: boolean;
    gemini_configured: boolean;
    paypal_environment?: string;
  }>({
    status: "CHECKING",
    paypal_configured: false,
    gemini_configured: false,
  });

  // Real Photo Upload + Gemini Vision State
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoTxId, setPhotoTxId] = useState<string>("");
  const [photoTxQuery, setPhotoTxQuery] = useState<string>("");
  const [txSuggestionsOpen, setTxSuggestionsOpen] = useState<boolean>(false);
  const [visionResult, setVisionResult] = useState<any>(null);
  const [visionPipelineStep, setVisionPipelineStep] = useState<number>(0);
  const [orderPhotos, setOrderPhotos] = useState<Record<string, { file: File; previewUrl: string }>>({});

  // Real Gemini Agent Prompt State
  const [agentPrompt, setAgentPrompt] = useState<string>(
    "Buy 1 Keychron Wireless Mechanical Keyboard for engineering team under Rs 12000 from Keychron India"
  );
  const [agentRunResult, setAgentRunResult] = useState<any>(null);

  // Maker-Checker Verification Result
  const [makerCheckerRes, setMakerCheckerRes] = useState<any>(null);

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

  const formatMoney = (inrAmount: number | string | undefined | null) => {
    const num = typeof inrAmount === "string" ? parseFloat(inrAmount) : Number(inrAmount);
    const val = !isNaN(num) && isFinite(num) ? num : 0;
    if (currency === "USD") {
      const usd = val / RATE;
      return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatTxMoney = (tx: any) => {
    if (tx?.amount_inr != null) return formatMoney(tx.amount_inr);
    const raw = Number(tx?.amount || 0);
    const txCur = String(tx?.currency || "INR").toUpperCase();
    const inrVal = txCur === "USD" ? raw * RATE : raw;
    return formatMoney(inrVal);
  };

  useEffect(() => {
    const handleAnomaly = (e: any) => {
      const msg = e.detail?.message || "NETWORK ANOMALY: TRANSACTION SAFELY ABORTED.";
      setAnomalyToast(msg);
      setTimeout(() => setAnomalyToast(null), 6000);
    };
    window.addEventListener(NETWORK_ANOMALY_EVENT, handleAnomaly);
    return () => window.removeEventListener(NETWORK_ANOMALY_EVENT, handleAnomaly);
  }, []);

  const fetchData = async (includeCatalog = false) => {
    try {
      const [healthRes, mandateRes, txRes, accountRes, prodRes, ksRes] = await Promise.all([
        fetch(`${API_BASE}/api/health`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`${API_BASE}/api/mandates`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`${API_BASE}/api/transactions`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`${API_BASE}/api/paypal/account`).then((r) => (r.ok ? r.json() : undefined)).catch(() => undefined),
        includeCatalog
          ? fetch(`${API_BASE}/api/products`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
          : Promise.resolve(null),
        fetch(`${API_BASE}/api/kill-switch/status`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (healthRes && healthRes.status === "ONLINE") {
        setBackendHealth((prev) =>
          prev.status === "ONLINE" &&
          prev.paypal_configured === Boolean(healthRes.paypal_configured) &&
          prev.gemini_configured === Boolean(healthRes.gemini_configured) &&
          prev.paypal_environment === healthRes.paypal_environment
            ? prev
            : {
                status: "ONLINE",
                paypal_configured: Boolean(healthRes.paypal_configured),
                gemini_configured: Boolean(healthRes.gemini_configured),
                paypal_environment: healthRes.paypal_environment,
              }
        );
      } else {
        setBackendHealth((prev) => (prev.status === "OFFLINE" ? prev : { ...prev, status: "OFFLINE" }));
      }
      if (mandateRes) {
        setMandate((prev: any) =>
          JSON.stringify(prev) === JSON.stringify(mandateRes) ? prev : mandateRes
        );
      }
      if (Array.isArray(txRes)) {
        setTransactions((prev) =>
          JSON.stringify(prev) === JSON.stringify(txRes) ? prev : txRes
        );
      }
      if (accountRes !== undefined) {
        setConnectedAccount((prev: any) =>
          JSON.stringify(prev) === JSON.stringify(accountRes) ? prev : accountRes
        );
      }
      if (Array.isArray(prodRes) && prodRes.length > 0) setProducts(prodRes);
      if (ksRes) {
        setKillSwitchStatus((prev: any) =>
          JSON.stringify(prev) === JSON.stringify(ksRes) ? prev : ksRes
        );
      }
    } catch {
      setBackendHealth((prev) => (prev.status === "OFFLINE" ? prev : { ...prev, status: "OFFLINE" }));
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  useEffect(() => {
    if (hasOpenModal || isEdgeBuyOpen) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchData(false);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [hasOpenModal, isEdgeBuyOpen]);

  const handleSaveBudget = async (newBalanceInr: number, newMaxSpendInr: number) => {
    setLoading(true);
    setBusyAction("mandate");
    setNotice({ status: "LOADING", title: "Updating Mandate Limits", message: "Saving spend cap and escrow pool balance..." });
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
        title: "Mandate Limits Updated",
        message: `Pool balance updated to ${formatMoney(newBalanceInr)} with single-order limit ${formatMoney(newMaxSpendInr)}.`,
      });
    } catch (e: any) {
      setNotice({ status: "ERROR", title: "Update Failed", message: e.message });
    } finally {
      setLoading(false);
      setBusyAction(null);
    }
  };


  const handleBuyItem = async (product: Product) => {
    setLoading(true);
    setBusyAction(`buy:${product.id}`);
    setNotice({ status: "LOADING", title: "Creating PayPal Escrow Order", message: `Submitting ${product.name} to PayPal Orders v2...` });
    try {
      const sendUsd = currency === "USD";
      const orderAmount = sendUsd ? Number((product.amount / RATE).toFixed(2)) : product.amount;
      const orderPayload = {
        ...product,
        amount: orderAmount,
        amount_inr: product.amount,
        currency: sendUsd ? "USD" : "INR",
      };
      const res = await fetcher.post(`${API_BASE}/api/procure-item`, orderPayload);
      await fetchData();

      if (res.anomaly) {
        setNotice({ status: "ERROR", title: "Circuit Breaker Engaged", message: res.error || "Transaction safely aborted." });
      } else if (res.status === 403) {
        const detail = res.data?.detail || res.data;
        setNotice({
          status: "BLOCKED",
          title: "Blocked by OpenGuardrails (HTTP 403)",
          message: detail?.reason || detail?.message || `${product.name} violated corporate mandate rules.`,
        });
      } else if (res.ok) {
        const isAuth = res.data?.status === "AUTHORIZED";
        setNotice({
          status: "SUCCESS",
          title: isAuth ? "Escrow Authorized" : "PayPal Order Created — Awaiting Buyer Approval",
          message: isAuth
            ? `${product.name} authorized in PayPal Escrow.`
            : `Order ${res.data?.paypal_order_id} created in PayPal Sandbox. Click "Approve on PayPal" in Escrow Orders.`,
        });
        confetti({ particleCount: 80, spread: 65, origin: { y: 0.6 } });
        setActiveTab("orders");
      } else {
        setNotice({ status: "ERROR", title: "Order Halted", message: res.error || "Could not create PayPal order." });
      }
    } catch (e: any) {
      setNotice({ status: "ERROR", title: "Order Error", message: e.message });
    } finally {
      setLoading(false);
      setBusyAction(null);
      setCheckoutProduct(null);
    }
  };

  const handleAuthorizeOrder = async (orderId: string) => {
    setLoading(true);
    setBusyAction(`auth:${orderId}`);
    setNotice({ status: "LOADING", title: "Verifying PayPal Approval", message: `Authorizing escrow hold for ${orderId}...` });
    try {
      const res = await fetcher.post(`${API_BASE}/api/paypal/orders/${orderId}/authorize`, {});
      await fetchData();
      if (res.ok) {
        confetti({ particleCount: 95, spread: 70, origin: { y: 0.6 } });
        setNotice({
          status: "SUCCESS",
          title: "Payment Authorized (Escrow Locked)",
          message: `PayPal Authorization ID ${res.data?.paypal_auth_id || "Confirmed"} is active. Upload a delivery photo to release funds.`,
        });
      } else {
        const detail = res.data?.detail || res.data;
        setNotice({
          status: "ERROR",
          title: "Authorization Rejected",
          message: detail?.message || res.error || "Order must be approved by the buyer on PayPal first.",
        });
      }
    } catch (e: any) {
      setNotice({ status: "ERROR", title: "Authorization Error", message: e.message });
    } finally {
      setLoading(false);
      setBusyAction(null);
    }
  };


  const runSettlementAction = async (txId: string, mode: "CAPTURE" | "VOID") => {
    const targetTx = transactions.find((t) => t.id === txId) || { id: txId, item_name: txId, amount: 0, currency: "USD" };
    const isCap = mode === "CAPTURE";
    setLoading(true);
    setBusyAction(`${isCap ? "capture" : "void"}:${txId}`);
    setSettlementFlow({
      isOpen: true,
      mode,
      phase: "running",
      activeStep: 1,
      tx: targetTx,
    });
    const t2 = setTimeout(
      () => setSettlementFlow((prev) => (prev?.isOpen && prev.phase === "running" ? { ...prev, activeStep: 2 } : prev)),
      220
    );
    const t3 = setTimeout(
      () => setSettlementFlow((prev) => (prev?.isOpen && prev.phase === "running" ? { ...prev, activeStep: 3 } : prev)),
      550
    );
    setNotice({
      status: "LOADING",
      title: isCap ? "Capturing PayPal Escrow" : "Voiding / Disputing PayPal Escrow",
      message: isCap ? `Executing live PayPal capture for ${txId}...` : `Contacting PayPal API for ${txId}...`,
    });
    try {
      const endpoint = `${API_BASE}/api/transactions/${encodeURIComponent(txId)}/${isCap ? "capture" : "void"}`;
      const bodyPayload = isCap ? {} : { reason: "Buyer reported damaged parcel / delivery verification failed" };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json().catch(() => ({}));
      await fetchData();
      if (res.ok) {
        if (isCap) {
          confetti({ particleCount: 110, spread: 80, origin: { y: 0.6 } });
        }
        const resolvedStatus = data?.status || (isCap ? "CAPTURED" : "VOIDED");
        setVisionResult((prev: any) =>
          prev && (prev.transaction_id === txId || prev.auto_matched_order_id === txId)
            ? {
                ...prev,
                status: resolvedStatus,
                grace_hold_active: false,
                paypal_capture_id: data?.paypal_capture_id || prev.paypal_capture_id,
              }
            : prev
        );
        setSettlementFlow((prev) =>
          prev
            ? {
                ...prev,
                phase: "success",
                activeStep: 4,
                tx: {
                  ...targetTx,
                  status: data?.status || (isCap ? "CAPTURED" : "VOIDED"),
                  paypal_capture_id: data?.paypal_capture_id || targetTx.paypal_capture_id,
                  paypal_dispute_id: data?.paypal_dispute_id || targetTx.paypal_dispute_id,
                },
                result: data,
              }
            : null
        );
        setNotice({
          status: isCap ? "CAPTURED" : "DISPUTED",
          title: isCap
            ? `PayPal Funds Captured (${data?.paypal_capture_id || "Confirmed"})`
            : data.status === "VOIDED"
            ? "Authorization Voided"
            : "PayPal Dispute Opened",
          message: data.message || (isCap ? "Funds captured on PayPal." : "Transaction voided / disputed on PayPal."),
        });
      } else {
        const errMsg =
          data?.detail?.message || data?.message || (isCap ? "PayPal capture failed." : "PayPal void/dispute call failed.");
        setSettlementFlow((prev) =>
          prev ? { ...prev, phase: "error", activeStep: 3, errorMessage: errMsg } : null
        );
        setNotice({
          status: "BLOCKED",
          title: isCap ? "PayPal Capture Error" : "PayPal Void / Dispute Error",
          message: errMsg,
        });
      }
    } catch (e: any) {
      const errMsg = e?.message || "Network error";
      setSettlementFlow((prev) =>
        prev ? { ...prev, phase: "error", activeStep: 2, errorMessage: errMsg } : null
      );
      setNotice({
        status: "ERROR",
        title: isCap ? "Capture Error" : "Void / Dispute Error",
        message: errMsg,
      });
    } finally {
      clearTimeout(t2);
      clearTimeout(t3);
      setLoading(false);
      setBusyAction(null);
    }
  };

  const handleCaptureFunds = (txId: string) => runSettlementAction(txId, "CAPTURE");

  const handleVoidOrDispute = (txId: string) => runSettlementAction(txId, "VOID");

  const handleDeleteOrder = async (txId: string) => {
    setBusyAction(`delete:${txId}`);
    try {
      const res = await fetch(`${API_BASE}/api/transactions/${encodeURIComponent(txId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTransactions((prev) => prev.filter((t: any) => t.id !== txId && t.paypal_order_id !== txId));
        setOrderPhotos((prev) => {
          if (!prev[txId]) return prev;
          const next = { ...prev };
          delete next[txId];
          return next;
        });
        if (selectedTx?.id === txId) {
          setSelectedTx(null);
        }
        await fetchData();
        setNotice({
          status: "SUCCESS",
          title: "Order Deleted",
          message: data?.message || `Removed ${txId} from Orders cart.`,
        });
      } else {
        setNotice({
          status: "BLOCKED",
          title: "Delete Order Failed",
          message: data?.detail?.message || data?.detail || data?.message || "Could not delete order.",
        });
      }
    } catch (e: any) {
      setNotice({ status: "ERROR", title: "Delete Error", message: e?.message || "Network error" });
    } finally {
      setBusyAction(null);
    }
  };

  const handlePhotoFileSelected = (file: File | null, targetTxId?: string) => {
    setSelectedPhotoFile(file);
    setVisionResult(null);
    setVisionPipelineStep(0);
    if (targetTxId !== undefined) {
      setPhotoTxId(targetTxId);
      setPhotoTxQuery(targetTxId);
    }
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreviewUrl(previewUrl);
      if (targetTxId) {
        setOrderPhotos((prev) => ({
          ...prev,
          [targetTxId]: { file, previewUrl },
        }));
      }
    } else {
      setPhotoPreviewUrl(null);
      if (targetTxId) {
        setOrderPhotos((prev) => {
          const next = { ...prev };
          delete next[targetTxId];
          return next;
        });
      }
    }
  };

  const resetVisionWorkspace = () => {
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(null);
    setVisionResult(null);
    setVisionPipelineStep(0);
    setPhotoTxId("");
    setPhotoTxQuery("");
    setTxSuggestionsOpen(false);
  };

  const handleInspectRealPhoto = async (
    fileOverride?: File | null,
    txOverride?: string,
    stayOnTab = false
  ) => {
    const txId = txOverride ?? photoTxId;
    const capturedEntry = txId ? orderPhotos[txId] : undefined;
    const file = fileOverride ?? capturedEntry?.file ?? selectedPhotoFile;
    if (!file) {
      setNotice({ status: "BLOCKED", title: "No Photo Captured", message: "Capture or upload a parcel image first before inspecting." });
      return;
    }
    setLoading(true);
    setBusyAction(txId ? `vision:${txId}` : "vision");
    setVisionPipelineStep(1);
    const step2Timer = setTimeout(() => setVisionPipelineStep((s) => (s > 0 && s < 2 ? 2 : s)), 350);
    const step3Timer = setTimeout(() => setVisionPipelineStep((s) => (s > 0 && s < 3 ? 3 : s)), 1250);
    setNotice({
      status: "LOADING",
      title: txId ? "Gemini Vision + Auto-Settlement" : "Gemini Vision Analyzing Photo",
      message: txId
        ? `Analyzing ${file.name} via Google Gemini Vision & settling PayPal Escrow for ${txId}...`
        : `Sending ${file.name} to Google Gemini Vision API...`,
    });
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (txId) {
        formData.append("transaction_id", txId);
        formData.append("auto_settle", "true");
      }

      const res = await fetch(`${API_BASE}/api/vision/inspect-photo`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      await fetchData();
      if (res.ok) {
        setVisionPipelineStep(4);
        setVisionResult(data);
        const savedTxId = data?.transaction_id || txId;
        if (savedTxId && data?.evidence_url) {
          setOrderPhotos((prev) => {
            if (!prev[savedTxId]) return prev;
            const next = { ...prev };
            delete next[savedTxId];
            return next;
          });
        }
        if (!stayOnTab) {
          setActiveTab("vision");
        }
        const rec = data?.inspection?.analysis?.recommended_action;
        if (data?.status === "CAPTURED") {
          confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 } });
          setNotice({
            status: "CAPTURED",
            title: `Vision Passed → PayPal Funds Captured (${data?.paypal_capture_id || "Live"})`,
            message: data.message,
          });
        } else if (data?.grace_hold_active) {
          setNotice({
            status: "RETRY_PENDING",
            title: `Mismatch (${data?.mismatch_attempts}/${data?.max_mismatch_attempts}) — PayPal Hold Kept Intact`,
            message: data.message,
          });
        } else if (data?.auto_settled) {
          setNotice({
            status: "DISPUTED",
            title:
              data?.is_mismatch
                ? `Mismatch Limit Reached (${data?.mismatch_attempts}/${data?.max_mismatch_attempts}) → PayPal ${data.status}`
                : `Vision Flagged Damage → PayPal ${data.status}`,
            message: data.message,
          });
        } else {
          setNotice({
            status: rec === "CAPTURE_ESCROW" ? "SUCCESS" : "DISPUTED",
            title: `Gemini Vision Inspection Complete (${data?.inspection?.model || "Live"})`,
            message: data.message || "Real photo analyzed.",
          });
        }
      } else {
        setVisionPipelineStep(0);
        setNotice({
          status: "BLOCKED",
          title: "Gemini Vision Error",
          message: data?.detail?.message || data?.message || "Gemini Vision request failed.",
        });
      }
    } catch (e: any) {
      setVisionPipelineStep(0);
      setNotice({ status: "ERROR", title: "Upload Failed", message: e?.message || "Network error." });
    } finally {
      clearTimeout(step2Timer);
      clearTimeout(step3Timer);
      setLoading(false);
      setBusyAction(null);
    }
  };


  const handleRunGeminiAgent = async () => {
    if (!agentPrompt.trim()) return;
    setLoading(true);
    setBusyAction("agent");
    setNotice({ status: "LOADING", title: "AI Auto-Buy Executing", message: "Parsing request & running OpenGuardrails policy verification..." });
    try {
      const res = await fetch(`${API_BASE}/api/agent/procure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: agentPrompt, execute: true, currency }),
      });
      const data = await res.json().catch(() => ({}));
      await fetchData();
      if (res.ok) {
        setAgentRunResult(data);
        if (data.status === "ORDER_CREATED") {
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
          setNotice({
            status: "SUCCESS",
            title: "AI Auto-Buy → PayPal Order Created",
            message: `${data?.agent?.analysis?.item_name} submitted to PayPal Orders v2 (${data?.order?.paypal_order_id}).`,
          });
        } else {
          setNotice({
            status: "BLOCKED",
            title: `AI Auto-Buy: ${data.status}`,
            message: data?.guardrail_detail?.message || data?.guardrail_detail?.reason || "Blocked by policy guardrails.",
          });
        }
      } else {
        setNotice({
          status: "BLOCKED",
          title: "AI Auto-Buy Blocked",
          message: data?.detail?.message || data?.message || "AI Auto-Buy request failed.",
        });
      }
    } catch (e: any) {
      setNotice({ status: "ERROR", title: "Agent Error", message: e?.message || "Request failed." });
    } finally {
      setLoading(false);
      setBusyAction(null);
    }
  };


  const getProductIcon = (cat: string, id: string) => {
    if (cat === "luxury") return <Watch className="w-5 h-5 text-rose-500" />;
    if (cat === "cloud") return <Server className="w-5 h-5 text-sky-600" />;
    if (cat === "hardware") return <Cpu className="w-5 h-5 text-amber-600" />;
    if (cat === "office") return <Briefcase className="w-5 h-5 text-indigo-600" />;
    if (id === "PROD-001") return <Smartphone className="w-5 h-5 text-emerald-600" />;
    return <Laptop className="w-5 h-5 text-emerald-600" />;
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.merchant.toLowerCase().includes(searchQuery.toLowerCase());
    if (categoryFilter === "all") return matchesSearch;
    return matchesSearch && p.category === categoryFilter;
  });

  const filteredTransactions = transactions.filter((tx) => {
    if (orderFilter === "all") return true;
    if (orderFilter === "pending") return tx.status === "ORDER_CREATED" || tx.status === "AUTHORIZATION_PENDING";
    if (orderFilter === "authorized") return tx.status === "AUTHORIZED";
    if (orderFilter === "captured") return tx.status === "CAPTURED";
    if (orderFilter === "disputed") return tx.status === "DISPUTED" || tx.status === "VOIDED";
    if (orderFilter === "blocked") return tx.status === "BLOCKED";
    return true;
  });

  const authorizedCount = transactions.filter((t) => t.status === "AUTHORIZED").length;
  const pendingCount = transactions.filter((t) => t.status === "ORDER_CREATED" || t.status === "AUTHORIZATION_PENDING").length;
  const poolUsagePct = mandate.total_pool > 0 ? Math.min(100, Math.round((mandate.remaining_pool / mandate.total_pool) * 100)) : 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f4fe] via-[#faf9ff] to-[#f1edfc] text-slate-900 font-sans flex flex-col">
      {/* Circuit Breaker Alert Banner */}
      {killSwitchStatus.is_locked_down && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-rose-700 font-semibold">
            <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
            <span>SECURITY LOCKDOWN ACTIVE — ALL AGENT PROCUREMENT FROZEN</span>
          </div>
          <button
            onClick={async () => {
              await fetch(`${API_BASE}/api/kill-switch/reset`, { method: "POST" });
              await fetchData();
            }}
            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-sm"
          >
            Disarm Lock
          </button>
        </div>
      )}

      {/* Network Anomaly Toast */}
      {anomalyToast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-white border border-rose-300 rounded-2xl p-4 shadow-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-semibold text-rose-700">Circuit Breaker Engaged</p>
            <p className="text-slate-600 mt-0.5">{anomalyToast}</p>
          </div>
          <button onClick={() => setAnomalyToast(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* GLOBAL TOP LOADING PROGRESS BAR */}
      {loading && (
        <div className="fixed top-0 inset-x-0 z-[70] h-[3px] bg-violet-100 overflow-hidden pointer-events-none">
          <div className="h-full w-1/3 bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-400 animate-loading-bar" />
        </div>
      )}

      {/* PC DESKTOP TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#ece8f8] shadow-[0_2px_12px_rgba(109,40,217,0.04)]">
        <div className="max-w-[1460px] w-full mx-auto pl-5 sm:pl-6 pr-20 sm:pr-24 h-16 flex items-center justify-between gap-3">
          {/* Left: Brand + Primary Desktop Navigation */}
          <div className="flex items-center gap-3 2xl:gap-6 min-w-0">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-[#f3efff] border border-[#e0d4fc] flex items-center justify-center shadow-sm shrink-0">
                <AuroraShieldLogo className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap">AuroraPay</span>
                <span className="hidden 2xl:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#f5f3ff] border border-[#e5e0fa] text-slate-500 font-medium whitespace-nowrap">
                  ClearGuard OS
                </span>
              </div>
            </div>

            <nav className="hidden xl:flex items-center gap-1 min-w-0">
              {[
                { id: "overview", label: "Overview & Catalog", icon: ShoppingBag },
                { id: "orders", label: `Escrow Orders (${transactions.length})`, icon: Activity },
                { id: "vision", label: "Vision Dashboard", icon: Camera },
                { id: "settings", label: "Mandate & Safeguards", icon: Shield },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as NavSection)}
                    className={`px-2.5 2xl:px-3.5 py-2 rounded-xl text-[11px] 2xl:text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-[#f2ecff] text-[#6d28d9] border border-[#e2d6fe] font-semibold shadow-sm"
                        : "text-slate-600 hover:text-[#6d28d9] hover:bg-[#f7f4ff]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Live Controls */}
          <div className="flex items-center gap-1.5 2xl:gap-2 shrink-0">
            <button
              onClick={() => setCurrency(currency === "USD" ? "INR" : "USD")}
              className="px-2.5 py-1.5 rounded-xl bg-[#f8f7fc] hover:bg-violet-50 border border-slate-200 hover:border-violet-200 text-xs font-mono font-semibold text-slate-800 transition-colors shrink-0"
              title="Switch display and order currency"
            >
              {currency}
            </button>

            <button
              onClick={() => setIsSetAmountModalOpen(true)}
              className="px-2.5 2xl:px-3 py-1.5 rounded-xl bg-white hover:bg-[#f8f7fc] border border-slate-200 hover:border-violet-200 text-xs font-medium text-slate-700 hidden sm:flex items-center gap-1.5 transition-colors shadow-xs shrink-0 whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Limits</span>
            </button>

            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-2.5 2xl:px-3 py-1.5 rounded-xl bg-white hover:bg-[#f8f7fc] border border-slate-200 hover:border-violet-200 text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition-colors shadow-xs shrink-0 whitespace-nowrap"
            >
              <PayPalLogo className="w-3.5 h-3.5 shrink-0" />
              <span className={`w-2 h-2 rounded-full ${connectedAccount ? "bg-emerald-500" : "bg-amber-400"}`} />
              <span>{connectedAccount ? "PayPal Linked" : "Connect PayPal"}</span>
            </button>

            <button
              onClick={() => setIsCustomProcureOpen(true)}
              className="px-3 2xl:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#8b5cf6] hover:to-[#6366f1] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_6px_16px_rgba(109,40,217,0.28)] shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>New Custom Order</span>
            </button>
          </div>
        </div>

        {/* Tablet & Mobile Secondary Tab Strip */}
        <div className="xl:hidden border-t border-[#ece8f8] pl-5 sm:pl-6 pr-20 sm:pr-24 py-2 flex items-center gap-2 overflow-x-auto bg-white">
          {[
            { id: "overview", label: "Overview & Catalog" },
            { id: "orders", label: `Escrow Orders (${transactions.length})` },
            { id: "vision", label: "Vision Dashboard" },
            { id: "settings", label: "Mandate & Safeguards" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavSection)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                activeTab === item.id ? "bg-[#f2ecff] text-[#6d28d9] font-semibold" : "text-slate-600"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* MAIN DESKTOP CONTAINER — extra right clearance keeps floating edge dock from overlapping cards */}
      <main className="flex-1 max-w-[1460px] w-full mx-auto pl-5 sm:pl-6 pr-20 sm:pr-24 py-6 space-y-6">
        {/* 4-COLUMN PC KPI BAR */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="surface-card p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Escrow Pool Remaining</span>
              <Wallet className="w-4 h-4 text-[#7c3aed]" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-slate-900 tabular-nums">{formatMoney(mandate.remaining_pool)}</span>
              <span className="text-[11px] font-mono text-slate-500">{poolUsagePct}% avail</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#ede9fe] overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#7c3aed] to-[#6366f1] rounded-full transition-all" style={{ width: `${poolUsagePct}%` }} />
            </div>
          </div>

          <div className="surface-card p-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Per-Order Cap</span>
              <Shield className="w-4 h-4 text-[#7c3aed]" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-slate-900 tabular-nums">{formatMoney(mandate.max_single_spend)}</span>
              <button
                onClick={() => setIsSetAmountModalOpen(true)}
                className="text-[11px] text-[#6d28d9] hover:text-violet-800 hover:underline font-semibold"
              >
                Adjust
              </button>
            </div>
            <p className="text-[11px] text-slate-500 truncate">Allowed: {mandate.allowed_categories}</p>
          </div>

          <div className="surface-card p-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Escrow Pipeline</span>
              <ShoppingBag className="w-4 h-4 text-[#7c3aed]" />
            </div>
            <div className="flex items-baseline gap-4">
              <div>
                <span className="text-xl font-extrabold text-slate-900 tabular-nums">{authorizedCount}</span>
                <span className="text-xs text-slate-500 ml-1">Authorized</span>
              </div>
              <div>
                <span className="text-xl font-extrabold text-[#6d28d9] tabular-nums">{pendingCount}</span>
                <span className="text-xs text-slate-500 ml-1">Pending</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("orders")}
              className="text-[11px] text-[#6d28d9] hover:text-violet-800 font-semibold inline-flex items-center gap-1"
            >
              <span>Manage orders</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="surface-card p-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Live Backend &amp; APIs</span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  backendHealth.status === "ONLINE" ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${
                  backendHealth.status === "ONLINE"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-rose-50 border-rose-200 text-rose-700"
                }`}
              >
                API :8000 {backendHealth.status}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${
                  backendHealth.paypal_configured
                    ? "bg-violet-50 border-violet-200 text-violet-700"
                    : "bg-amber-50 border-amber-200 text-amber-700"
                }`}
              >
                PayPal: {backendHealth.paypal_configured ? "Ready" : "Missing"}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${
                  backendHealth.gemini_configured
                    ? "bg-violet-50 border-violet-200 text-violet-700"
                    : "bg-amber-50 border-amber-200 text-amber-700"
                }`}
              >
                AI Engine: {backendHealth.gemini_configured ? "Ready" : "Missing"}
              </span>
            </div>
            {(!backendHealth.paypal_configured || !backendHealth.gemini_configured) && (
              <p className="text-[11px] text-slate-500">Add missing keys in <code className="text-slate-700">.env</code></p>
            )}
          </div>
        </section>

        {/* INLINE ACTION NOTICE */}
        {notice && (
          <div
            className={`rounded-2xl border px-4 py-3 flex items-start justify-between gap-4 text-xs shadow-sm transition-all ${
              notice.status === "SUCCESS" || notice.status === "CAPTURED"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : notice.status === "BLOCKED" || notice.status === "ERROR" || notice.status === "DISPUTED"
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : notice.status === "LOADING"
                ? "bg-violet-50 border-violet-200 text-violet-900"
                : "bg-white border-[#ece8f8] text-slate-800"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {notice.status === "LOADING" && <Loader2 className="w-4 h-4 text-violet-600 animate-spin shrink-0 mt-0.5" />}
              <div className="space-y-0.5">
                <p className="font-semibold text-sm">{notice.title || notice.status}</p>
                <p className="opacity-85">{notice.message}</p>
              </div>
            </div>
            <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-700 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ==================== TAB 1: OVERVIEW & CATALOG ==================== */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Columns: Product Catalog */}
            <div className="lg:col-span-8 space-y-4">
              <div className="surface-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: "all", label: `All Items (${products.length})` },
                    { id: "electronics", label: "Electronics" },
                    { id: "hardware", label: "Hardware" },
                    { id: "cloud", label: "Cloud Compute" },
                    { id: "office", label: "Office" },
                    { id: "luxury", label: "Policy Block Test" },
                  ].map((pill) => (
                    <button
                      key={pill.id}
                      onClick={() => setCategoryFilter(pill.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                        categoryFilter === pill.id
                          ? "bg-[#f3efff] border-2 border-[#7c3aed] text-[#5b21b6] font-semibold shadow-xs"
                          : "bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700"
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter catalog..."
                    className="w-full bg-[#f9f8fe] border border-slate-200 rounded-full pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map((product) => {
                  const isPolicyTest = product.category === "luxury";
                  return (
                    <div
                      key={product.id}
                      className="surface-card hover:border-violet-300 p-5 flex flex-col justify-between gap-4 transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                              isPolicyTest
                                ? "bg-rose-50 border-rose-200"
                                : "bg-emerald-50 border-emerald-200"
                            }`}
                          >
                            {getProductIcon(product.category, product.id)}
                          </div>
                          <span
                            className={`text-[10px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full border ${
                              isPolicyTest
                                ? "bg-rose-50 text-rose-600 border-rose-200"
                                : "bg-violet-50 text-violet-700 border-violet-200"
                            }`}
                          >
                            {isPolicyTest ? "Restricted Category" : product.category}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{product.name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{product.merchant}</p>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">{product.description}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-slate-400 block">Escrow Hold</span>
                          <span className={`text-base font-extrabold tabular-nums ${isPolicyTest ? "text-rose-600" : "text-slate-900"}`}>
                            {formatMoney(product.amount)}
                          </span>
                        </div>

                        <button
                          onClick={() => setCheckoutProduct(product)}
                          disabled={loading}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isPolicyTest
                              ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                              : "bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#8b5cf6] hover:to-[#6366f1] text-white shadow-[0_6px_16px_rgba(109,40,217,0.24)]"
                          }`}
                        >
                          {isPolicyTest ? "Test Guardrail Block" : "Procure via PayPal"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 4 Columns: Compact AI Dock Trigger & Live Ledger */}
            <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
              {/* Sleek Launcher Card (Matches vibrant purple gradient banner in screenshot) */}
              <button
                type="button"
                onClick={() => setIsEdgeBuyOpen((v) => !v)}
                className="w-full text-left group relative overflow-hidden bg-gradient-to-r from-[#7c3aed] via-[#6d28d9] to-[#6366f1] hover:from-[#8b5cf6] hover:to-[#6366f1] rounded-2xl p-4 shadow-[0_14px_30px_-8px_rgba(109,40,217,0.45)] transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform backdrop-blur-sm">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">AI Auto-Buy</span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                          Ready
                        </span>
                      </div>
                      <p className="text-[11px] text-violet-100 truncate mt-0.5">
                        Click or use the right-edge dock icon to buy with plain English
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/90 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </button>

              <div className="surface-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Recent Ledger Activity</h2>
                    <p className="text-[11px] text-slate-500">Click any transaction to inspect SHA-256 &amp; Vision proof</p>
                  </div>
                  <button onClick={() => setActiveTab("orders")} className="text-xs font-semibold text-[#6d28d9] hover:underline shrink-0">
                    View all ({transactions.length})
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {transactions.slice(0, 4).map((tx) => (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => setSelectedTx(tx)}
                      className="w-full py-2.5 px-2 -mx-2 rounded-xl hover:bg-[#f7f5fe] flex items-center justify-between gap-2 text-xs text-left transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{tx.item_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400">{tx.id}</span>
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                              tx.status === "CAPTURED"
                                ? "bg-emerald-50 text-emerald-700"
                                : tx.status === "BLOCKED" || tx.status === "DISPUTED" || tx.status === "VOIDED"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-violet-50 text-violet-700"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-900 shrink-0">{formatTxMoney(tx)}</span>
                    </button>
                  ))}
                  {transactions.length === 0 && (
                    <p className="text-xs text-slate-400 py-4 text-center">No transactions recorded yet.</p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* ==================== TAB 2: STACKED FULL-DETAIL ESCROW ORDER CARDS ==================== */}
        {activeTab === "orders" && (
          <div className="space-y-5">
            <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "all", label: `All (${transactions.length})` },
                  { id: "pending", label: "Pending Approval" },
                  { id: "authorized", label: "Authorized (Escrow)" },
                  { id: "captured", label: "Processed / Captured" },
                  { id: "disputed", label: "Declined / Voided" },
                  { id: "blocked", label: "Blocked" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setOrderFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      orderFilter === f.id
                        ? "bg-[#f3efff] border-2 border-[#7c3aed] text-[#5b21b6] font-semibold"
                        : "bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 ml-auto">
                <span className="hidden 2xl:inline text-[11px] font-mono text-slate-500">
                  Capture Photo first &rarr; Inspect Photo unlocks on Processed / Declined orders
                </span>
                <div className="inline-flex items-center p-1 rounded-xl bg-[#f5f3ff] border border-[#e5e0fa]">
                  <button
                    type="button"
                    onClick={() => setOrderViewMode("cards")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      orderViewMode === "cards"
                        ? "bg-white text-[#6d28d9] shadow-xs border border-[#e2d6fe]"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderViewMode("grid")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      orderViewMode === "grid"
                        ? "bg-gradient-to-r from-[#7c3aed] to-[#6366f1] text-white shadow-[0_4px_12px_rgba(109,40,217,0.28)]"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Table2 className="w-3.5 h-3.5" />
                    Audit Grid
                  </button>
                </div>
              </div>
            </div>

            {orderViewMode === "grid" ? (
              <TransactionsAgGrid
                transactions={filteredTransactions}
                currency={currency}
                rate={RATE}
                busyAction={busyAction}
                formatTxMoney={formatTxMoney}
                formatMoney={formatMoney}
                onInspect={(tx, tab) => openTxInspector(tx, tab || "hash_chain")}
                onAuthorize={handleAuthorizeOrder}
                onCapture={handleCaptureFunds}
                onVoid={handleVoidOrDispute}
                onDelete={handleDeleteOrder}
              />
            ) : filteredTransactions.length === 0 ? (
              <div className="surface-card py-14 text-center text-slate-500 text-xs">
                No orders match the current filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
                {filteredTransactions.map((tx: any) => {
                  const isPendingApproval = tx.status === "ORDER_CREATED" || tx.status === "AUTHORIZATION_PENDING";
                  const isAuthorized = tx.status === "AUTHORIZED";
                  const isCaptured = tx.status === "CAPTURED";
                  const isBlocked = tx.status === "BLOCKED";
                  const isVoidedOrDisputed = tx.status === "VOIDED" || tx.status === "DISPUTED";

                  // Only real post-checkout orders (authorized, captured, voided/disputed) allow delivery photo capture
                  const isProcessedOrDeclined = isAuthorized || isCaptured || isVoidedOrDisputed;
                  const capturedPhoto = orderPhotos[tx.id];
                  const savedEvidencePath = tx.vision_evidence_url || tx.vision_audit?.evidence_url;
                  const savedEvidenceUrl =
                    capturedPhoto?.previewUrl ||
                    (savedEvidencePath
                      ? String(savedEvidencePath).startsWith("http")
                        ? String(savedEvidencePath)
                        : `${API_BASE}${savedEvidencePath}`
                      : undefined);
                  const hasCapturedPhoto = Boolean(capturedPhoto || savedEvidenceUrl);
                  const savedVisionAnalysis = tx.vision_audit?.analysis || tx.vision_audit;
                  const rawVisionVerdict = savedVisionAnalysis?.verdict ? String(savedVisionAnalysis.verdict) : "";
                  const hasRealVisionVerdict = Boolean(
                    rawVisionVerdict &&
                      rawVisionVerdict !== "AWAITING_PHYSICAL_DELIVERY" &&
                      rawVisionVerdict !== "PRE_PURCHASE_POLICY_REJECTION"
                  );
                  const hasSavedVisionProof = Boolean(
                    !isBlocked && !isPendingApproval && (savedEvidenceUrl || tx.photo_evidence_hash || hasRealVisionVerdict)
                  );

                  const isGreenTheme = isCaptured || isAuthorized;
                  const isRedTheme = isBlocked || isVoidedOrDisputed;
                  const visionPassed =
                    tx.vision_approved === true || savedVisionAnalysis?.recommended_action === "CAPTURE_ESCROW";

                  const outerCardClass = isCaptured
                    ? "bg-white border-emerald-300 shadow-[0_14px_34px_-10px_rgba(16,185,129,0.2)]"
                    : isAuthorized && visionPassed
                    ? "bg-white border-emerald-200 shadow-[0_14px_34px_-10px_rgba(16,185,129,0.14)]"
                    : isBlocked
                    ? "bg-white border-rose-200 hover:border-rose-300 shadow-[0_12px_30px_-10px_rgba(244,63,94,0.12)]"
                    : "bg-white border-[#ece8f8] hover:border-violet-300 shadow-[0_12px_30px_-10px_rgba(109,40,217,0.10)]";

                  const innerScreenClass = isCaptured
                    ? "bg-emerald-50/45 border-emerald-100"
                    : isBlocked
                    ? "bg-rose-50/40 border-rose-100"
                    : "bg-[#faf9ff] border-[#ede9fe]";

                  const telemetryBoxClass = isCaptured
                    ? "bg-white border-emerald-100"
                    : isBlocked
                    ? "bg-white border-rose-100"
                    : "bg-white border-[#ebe6fa]";

                  const topAmountPillClass = isCaptured
                    ? "bg-emerald-600 text-white shadow-sm"
                    : isGreenTheme
                    ? "bg-gradient-to-r from-[#7c3aed] to-[#6366f1] text-white shadow-sm"
                    : isRedTheme
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-amber-500 text-white shadow-sm";

                  const statusLabel = isCaptured
                    ? "PAID • CAPTURED"
                    : isAuthorized
                    ? "PROCESSED • IN ESCROW"
                    : isBlocked
                    ? "DECLINED • BLOCKED"
                    : isVoidedOrDisputed
                    ? `DECLINED • ${tx.status}`
                    : "AWAITING APPROVAL";

                  const showCaptureControl =
                    !isBlocked && (isAuthorized || isVoidedOrDisputed || (isCaptured && !tx.vision_audit));

                  const attachPhoto = (file: File | null) => {
                    if (!file) return;
                    handlePhotoFileSelected(file, tx.id);
                    setNotice({
                      status: "SUCCESS",
                      title: `Photo Captured for ${tx.id}`,
                      message: `"${file.name}" attached. Inspect Photo is now unlocked.`,
                    });
                  };

                  return (
                    <div
                      key={tx.id}
                      className={`w-full h-full rounded-[26px] p-4 border flex flex-col transition-all ${outerCardClass}`}
                    >
                      {/* Top Header — Brand / Order ID + Pill Amount */}
                      <div className="flex items-center justify-between gap-2 px-1.5 mb-3.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 ${
                              isCaptured
                                ? "bg-emerald-50 border-emerald-200"
                                : "bg-[#f5f3ff] border-[#e5e0fa]"
                            }`}
                          >
                            <PayPalLogo className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 tracking-wide block leading-none">
                              AuroraPay
                            </span>
                            <span
                              className={`text-[10px] font-mono truncate block mt-0.5 ${
                                isCaptured ? "text-emerald-700" : "text-slate-400"
                              }`}
                            >
                              {tx.id}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div
                            className={`px-3.5 py-1.5 rounded-full text-xs font-black tracking-tight tabular-nums ${topAmountPillClass}`}
                          >
                            {formatTxMoney(tx)}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(tx.id)}
                            disabled={busyAction === `delete:${tx.id}`}
                            title="Delete order from cart"
                            aria-label={`Delete order ${tx.id}`}
                            className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 disabled:opacity-40 transition-colors cursor-pointer"
                          >
                            {busyAction === `delete:${tx.id}` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Inner Matte Card Screen */}
                      <div
                        className={`rounded-3xl p-4 sm:p-5 border flex-1 flex flex-col justify-between gap-4 ${innerScreenClass}`}
                      >
                        <div className="space-y-4">
                          {/* Status & Category Tag Bar */}
                          <div className="flex items-center justify-between gap-2">
                            <div
                              className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em] uppercase ${
                                isCaptured
                                  ? "text-emerald-700"
                                  : isAuthorized
                                  ? "text-[#6d28d9]"
                                  : isRedTheme
                                  ? "text-rose-600"
                                  : "text-amber-700"
                              }`}
                            >
                              <span>• {statusLabel}</span>
                              {isCaptured ? (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              ) : isRedTheme ? (
                                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 shrink-0" />
                              )}
                            </div>

                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                                isCaptured
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                  : "bg-violet-50 border-violet-200 text-violet-700"
                              }`}
                            >
                              {tx.category || "electronics"}
                            </span>
                          </div>

                          {/* Product Thumbnail + Cart Item Title & Merchant */}
                          <div className="flex items-start gap-3.5">
                            {isBlocked ? (
                              <div
                                className="relative w-[68px] h-[68px] rounded-xl border border-rose-200 bg-rose-50 shrink-0 flex flex-col items-center justify-center cursor-default"
                                title="Blocked pre-purchase by OpenGuardrails — not dispatched or eligible for photo audit"
                              >
                                {getProductIcon(tx.category || "electronics", tx.id)}
                                <span className="text-[8px] font-mono mt-1 uppercase text-rose-600 font-semibold">
                                  Blocked
                                </span>
                              </div>
                            ) : savedEvidenceUrl && (hasSavedVisionProof || isCaptured) ? (
                              <button
                                type="button"
                                onClick={() => openTxInspector(tx, "vision")}
                                className={`relative w-[68px] h-[68px] rounded-xl border overflow-hidden shrink-0 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                                  isCaptured
                                    ? "bg-white border-emerald-400 hover:border-emerald-500"
                                    : "bg-white border-violet-300 hover:border-violet-500"
                                }`}
                                title="Click to inspect saved POD photo and full order details"
                              >
                                <img
                                  src={savedEvidenceUrl}
                                  alt={tx.item_name}
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] font-mono text-emerald-300 text-center py-0.5 uppercase">
                                  {savedVisionAnalysis?.integrity_score
                                    ? `POD ${Math.round(Number(savedVisionAnalysis.integrity_score) * 100)}%`
                                    : "POD Saved"}
                                </span>
                              </button>
                            ) : (
                              <label
                                className={`relative w-[68px] h-[68px] rounded-xl border overflow-hidden shrink-0 flex flex-col items-center justify-center transition-colors ${
                                  isCaptured
                                    ? "bg-emerald-50 border-emerald-200"
                                    : hasCapturedPhoto
                                    ? "bg-violet-50 border-violet-300"
                                    : isProcessedOrDeclined
                                    ? "bg-white border-[#ddd6fe] hover:border-[#7c3aed] cursor-pointer"
                                    : "bg-slate-50 border-slate-200 opacity-75 cursor-not-allowed"
                                }`}
                                title={
                                  isProcessedOrDeclined
                                    ? "Click to capture or upload delivery photo"
                                    : "Order must be authorized before capturing delivery photo"
                                }
                              >
                                {savedEvidenceUrl ? (
                                  <>
                                    <img
                                      src={savedEvidenceUrl}
                                      alt={tx.item_name}
                                      className="w-full h-full object-cover"
                                    />
                                    <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] font-mono text-emerald-300 text-center py-0.5 uppercase">
                                      Photo Ready
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    {getProductIcon(tx.category || "electronics", tx.id)}
                                    <span
                                      className={`text-[8px] font-mono mt-1 uppercase ${
                                        isCaptured ? "text-emerald-700" : "text-slate-500"
                                      }`}
                                    >
                                      {isCaptured ? "Paid" : isProcessedOrDeclined ? "Add Photo" : "Locked"}
                                    </span>
                                  </>
                                )}
                                {isProcessedOrDeclined && (
                                  <input
                                    type="file"
                                    accept="image/*"
                                    disabled={loading}
                                    className="hidden"
                                    onChange={(e) => attachPhoto(e.target.files?.[0] || null)}
                                  />
                                )}
                              </label>
                            )}

                            <div className="min-w-0 flex-1 space-y-1">
                              <h3 className="text-[15px] font-bold text-slate-900 leading-snug line-clamp-2" title={tx.item_name}>
                                {tx.item_name}
                              </h3>
                              <p className={`text-xs truncate ${isCaptured ? "text-emerald-700" : "text-slate-500"}`}>
                                {tx.merchant_name || "Commercial Vendor"}
                              </p>
                              <p
                                className={`text-[10px] font-mono truncate ${
                                  isCaptured
                                    ? "text-emerald-700/85"
                                    : isBlocked
                                    ? "text-rose-600"
                                    : "text-slate-500"
                                }`}
                              >
                                {isBlocked
                                  ? "Blocked Pre-Checkout • Not Added to Escrow Cart"
                                  : `Delivery: ${tx.delivery_status || tx.status}`}
                              </p>
                            </div>
                          </div>

                          {/* Clean Order & Escrow Info Details */}
                          {isBlocked ? (
                            <div className={`border rounded-2xl p-3 space-y-1.5 text-[11px] ${telemetryBoxClass}`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-400 shrink-0">Policy Gate</span>
                                <span className="font-mono text-rose-600 font-semibold truncate">
                                  HTTP 403 Pre-Purchase Intercept
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-400 shrink-0">PayPal Escrow</span>
                                <span className="font-mono text-slate-700 truncate">
                                  Not Created ($0 Reserved)
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-400 shrink-0">Cart / Shipping</span>
                                <span className="font-mono text-slate-500 truncate">
                                  Halted Before Checkout
                                  {tx.created_at ? ` • ${String(tx.created_at).slice(11, 16)}` : ""}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-rose-100">
                                <span className="text-slate-400 shrink-0">Vision POD Audit</span>
                                <span className="font-mono text-rose-600 font-semibold truncate">
                                  Skipped — Blocked Before Delivery
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className={`border rounded-2xl p-3 space-y-1.5 text-[11px] ${telemetryBoxClass}`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-400 shrink-0">PayPal Order</span>
                                <span className="font-mono text-slate-800 truncate">{tx.paypal_order_id || "—"}</span>
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-400 shrink-0">
                                  {tx.paypal_capture_id
                                    ? "Capture ID"
                                    : tx.paypal_dispute_id
                                    ? "Dispute ID"
                                    : "Auth ID"}
                                </span>
                                <span
                                  className={`font-mono font-semibold truncate ${
                                    tx.paypal_capture_id
                                      ? "text-emerald-700"
                                      : tx.paypal_dispute_id
                                      ? "text-rose-600"
                                      : "text-[#6d28d9]"
                                  }`}
                                >
                                  {tx.paypal_capture_id || tx.paypal_dispute_id || tx.paypal_auth_id || "Awaiting Auth"}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-400 shrink-0">Tracking</span>
                                <span className="font-mono text-slate-700 truncate">
                                  {tx.tracking_number || "Pending"}
                                  {tx.created_at ? ` • ${String(tx.created_at).slice(11, 16)}` : ""}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                <span className="text-slate-400 shrink-0">Vision Audit</span>
                                {hasRealVisionVerdict ? (
                                  <span
                                    className={`font-mono font-semibold truncate ${
                                      savedVisionAnalysis.recommended_action === "CAPTURE_ESCROW" ||
                                      savedVisionAnalysis.verdict === "VERIFIED_INTACT"
                                        ? "text-emerald-700"
                                        : isAuthorized && tx.delivery_status === "VISION_MISMATCH_RETRY_PENDING"
                                        ? "text-amber-700"
                                        : "text-rose-600"
                                    }`}
                                  >
                                    {isAuthorized && tx.delivery_status === "VISION_MISMATCH_RETRY_PENDING"
                                      ? `MISMATCH (${tx.vision_mismatch_attempts || 1}/${tx.max_vision_mismatch_attempts || 3}) • HOLD KEPT`
                                      : `${savedVisionAnalysis.verdict} (${(Number(savedVisionAnalysis.integrity_score || 0) * 100).toFixed(0)}%)`}
                                  </span>
                                ) : hasCapturedPhoto ? (
                                  <span className="font-mono text-[#6d28d9] font-semibold truncate">Photo ready &rarr; Inspect</span>
                                ) : (
                                  <span className={`font-mono truncate ${isCaptured ? "text-emerald-700" : "text-slate-400"}`}>
                                    {isCaptured
                                      ? "Escrow settled"
                                      : isPendingApproval
                                      ? "Approve PayPal first"
                                      : isProcessedOrDeclined
                                      ? "Awaiting photo"
                                      : "Process order first"}
                                  </span>
                                )}
                              </div>

                              {(savedVisionAnalysis?.detected_item || tx.photo_evidence_hash) && (
                                <div className="flex items-center justify-between gap-2 text-[10px]">
                                  <span className="text-slate-400 shrink-0">Saved Proof</span>
                                  <span className="font-mono text-slate-600 truncate">
                                    {savedVisionAnalysis?.detected_item
                                      ? savedVisionAnalysis.detected_item
                                      : `SHA ${String(tx.photo_evidence_hash).slice(0, 12)}...`}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {(isBlocked || tx.block_reason) && (
                            <div className="text-[11px] bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 space-y-1">
                              <p className="text-rose-700 font-semibold leading-snug">
                                {tx.block_reason || tx.maker_checker_audit?.reason || "Blocked by OpenGuardrails & Spending Mandate."}
                              </p>
                              {isBlocked && (
                                <p className="text-[10px] text-rose-600 leading-snug">
                                  Stopped before PayPal order creation — excluded from escrow queue, shipping, and delivery photo audit.
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Bottom Flexible Cart / Escrow Action Controls — ONLY Needed Options Per State */}
                        <div
                          className={`pt-3 border-t flex flex-wrap items-center justify-between gap-1.5 ${
                            isCaptured ? "border-emerald-200" : isBlocked ? "border-rose-200" : "border-[#ebe6fa]"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isBlocked && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-rose-700 px-2 py-1 rounded-lg bg-rose-50 border border-rose-200">
                                <ShieldAlert className="w-3 h-3 text-rose-600" />
                                <span>0 PayPal Calls</span>
                              </span>
                            )}

                            {isPendingApproval && tx.approval_url && (
                              <a
                                href={tx.approval_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#8b5cf6] hover:to-[#6366f1] text-white text-[11px] font-semibold inline-flex items-center gap-1 shadow-xs"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Approve</span>
                              </a>
                            )}

                            {isPendingApproval && tx.paypal_order_id && (
                              <button
                                onClick={() => handleAuthorizeOrder(tx.paypal_order_id)}
                                disabled={loading}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white text-[11px] font-bold inline-flex items-center gap-1"
                              >
                                {busyAction === `auth:${tx.paypal_order_id}` ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Auth...</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3" />
                                    <span>Verify &amp; Auth</span>
                                  </>
                                )}
                              </button>
                            )}

                            {showCaptureControl && (
                              <label
                                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-medium inline-flex items-center gap-1 ${
                                  loading
                                    ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-55 pointer-events-none"
                                    : hasCapturedPhoto
                                    ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 cursor-pointer"
                                    : "bg-white hover:bg-[#f7f5fe] border-slate-200 hover:border-violet-300 text-slate-700 cursor-pointer"
                                }`}
                                title="Capture or upload delivery photo"
                              >
                                <Camera className="w-3 h-3" />
                                <span>{hasCapturedPhoto ? "Retake" : "Capture Photo"}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={loading}
                                  className="hidden"
                                  onChange={(e) => attachPhoto(e.target.files?.[0] || null)}
                                />
                              </label>
                            )}

                            {isProcessedOrDeclined && Boolean(capturedPhoto?.file) && (!isCaptured || !tx.vision_audit) && (
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleInspectRealPhoto(capturedPhoto?.file, tx.id, true)}
                                title="Inspect captured photo with Gemini Vision"
                                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#8b5cf6] hover:to-[#6366f1] disabled:opacity-60 text-white text-[11px] font-semibold inline-flex items-center gap-1 transition-all"
                              >
                                {busyAction === `vision:${tx.id}` ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Inspecting...</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3 h-3" />
                                    <span>Inspect Photo</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isAuthorized && tx.delivery_status === "VISION_MISMATCH_RETRY_PENDING" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPhotoTxId(tx.id);
                                  setPhotoTxQuery(tx.id);
                                  setActiveTab("vision");
                                }}
                                disabled={loading}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-semibold inline-flex items-center gap-1"
                                title="Re-upload correct POD photo in Vision Dashboard (PayPal hold is still intact)"
                              >
                                <Camera className="w-3 h-3" />
                                <span>Retry POD ({Math.max(0, (tx.max_vision_mismatch_attempts || 3) - (tx.vision_mismatch_attempts || 0))} left)</span>
                              </button>
                            )}

                            {isAuthorized && (
                              <button
                                onClick={() => handleCaptureFunds(tx.id)}
                                disabled={loading}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-xs"
                              >
                                {busyAction === `capture:${tx.id}` ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Capturing...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Capture</span>
                                  </>
                                )}
                              </button>
                            )}

                            {(isAuthorized || (isCaptured && !tx.paypal_dispute_id)) && (
                              <button
                                onClick={() => handleVoidOrDispute(tx.id)}
                                disabled={loading}
                                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-medium ${
                                  isCaptured
                                    ? "bg-white hover:bg-rose-50 border-emerald-200 hover:border-rose-200 text-slate-600 hover:text-rose-700"
                                    : "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700"
                                }`}
                              >
                                {busyAction === `void:${tx.id}` ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : isAuthorized ? (
                                  "Void"
                                ) : (
                                  "Dispute"
                                )}
                              </button>
                            )}

                            {hasSavedVisionProof && (
                              <button
                                type="button"
                                onClick={() => openTxInspector(tx, "vision")}
                                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold inline-flex items-center gap-1 ${
                                  isCaptured
                                    ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
                                    : "bg-white hover:bg-[#f7f5fe] border-slate-200 text-[#6d28d9]"
                                }`}
                                title="Inspect saved POD image and Vision details"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View POD</span>
                              </button>
                            )}

                            <button
                              onClick={() => openTxInspector(tx, isBlocked ? "maker_checker" : "hash_chain")}
                              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold inline-flex items-center gap-1 ${
                                isCaptured
                                  ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
                                  : isBlocked
                                  ? "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700"
                                  : "bg-[#f3efff] hover:bg-violet-100 border-[#e2d6fe] text-[#6d28d9]"
                              }`}
                              title={isBlocked ? "Inspect pre-purchase policy rejection details" : "View Full SHA-256 Chain & Audit"}
                            >
                              {isBlocked ? (
                                <ShieldAlert className="w-3 h-3 text-rose-600" />
                              ) : (
                                <Shield className="w-3 h-3 text-[#7c3aed]" />
                              )}
                              <span>{isCaptured ? "Receipt" : isBlocked ? "Why Blocked" : "Audit"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: GEMINI VISION LAB (COMPACT + CHAIN BLOCKS) ==================== */}
        {activeTab === "vision" && (() => {
          const isInspecting = Boolean(busyAction?.startsWith("vision"));
          const ins = visionResult?.inspection;
          const analysis = ins?.analysis;
          const hasResult = Boolean(ins && analysis);
          const chainPassed = hasResult && analysis.recommended_action === "CAPTURE_ESCROW";
          const chainFailed = hasResult && analysis.recommended_action !== "CAPTURE_ESCROW";
          const isSettledCaptured = visionResult?.status === "CAPTURED";
          const isSettledProtected = visionResult?.status === "VOIDED" || visionResult?.status === "DISPUTED";
          const boundTx = transactions.find(
            (t) => t.id === (photoTxId || visionResult?.transaction_id)
          );
          const isAlreadySettled =
            isSettledCaptured ||
            isSettledProtected ||
            boundTx?.status === "CAPTURED" ||
            boundTx?.status === "VOIDED" ||
            boundTx?.status === "DISPUTED";
          const mismatchAttempts = Number(
            visionResult?.mismatch_attempts ?? boundTx?.vision_mismatch_attempts ?? 0
          );
          const maxMismatchAttempts = Number(
            visionResult?.max_mismatch_attempts ?? boundTx?.max_vision_mismatch_attempts ?? 3
          );
          const isMismatchRetryPending =
            !isAlreadySettled &&
            !chainPassed &&
            (Boolean(visionResult?.grace_hold_active) ||
              (boundTx?.status === "AUTHORIZED" &&
                boundTx?.delivery_status === "VISION_MISMATCH_RETRY_PENDING"));
          const attemptsRemaining = Math.max(
            0,
            Number(visionResult?.attempts_remaining ?? maxMismatchAttempts - mismatchAttempts)
          );
          const activePipelineStep = isInspecting
            ? Math.max(1, visionPipelineStep)
            : hasResult || isAlreadySettled
            ? 4
            : 0;

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* LEFT DIV: PROOF OF DELIVERY (POD) IMAGE CAPTURE */}
              <div className="w-full h-full surface-card hover:border-violet-300 rounded-[26px] p-4 flex flex-col transition-all">
                <div className="flex items-center justify-between gap-2 px-1.5 mb-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#f3efff] border border-[#e2d6fe] flex items-center justify-center shrink-0">
                      <VisionLensLogo className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                        Proof of Delivery (POD)
                      </h2>
                      <p className="text-[11px] text-slate-500 truncate">
                        AI Validation &amp; Hash Verification
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-[10px] font-mono font-bold text-[#6d28d9] shrink-0">
                    Vision POD
                  </span>
                </div>

                <div className="bg-[#faf9ff] rounded-3xl p-4 sm:p-5 border border-[#ede9fe] flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label className="text-[11px] font-medium text-slate-600">
                          Target Escrow Order
                        </label>
                        <span
                          className={`text-[10px] font-mono font-semibold ${
                            photoTxId ? "text-emerald-700" : "text-slate-400"
                          }`}
                        >
                          {photoTxId ? `Bound: ${photoTxId}` : "Manual Inspection (Sandbox Mode)"}
                        </span>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={photoTxQuery}
                          onFocus={() => setTxSuggestionsOpen(true)}
                          onBlur={() => setTimeout(() => setTxSuggestionsOpen(false), 160)}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setPhotoTxQuery(raw);
                            setTxSuggestionsOpen(true);
                            const q = raw.trim().toLowerCase();
                            if (!q) {
                              setPhotoTxId("");
                              return;
                            }
                            const exact = transactions.find(
                              (t) =>
                                t.id?.toLowerCase() === q ||
                                t.paypal_order_id?.toLowerCase() === q ||
                                t.tracking_number?.toLowerCase() === q
                            );
                            setPhotoTxId(exact ? exact.id : "");
                          }}
                          placeholder="Type TX ID (e.g. TX-8819A20), PayPal ID, or item..."
                          className="w-full bg-white border border-[#e5e0fa] focus:border-[#7c3aed] rounded-xl pl-8 pr-8 py-2.5 text-xs text-slate-900 font-mono placeholder-slate-400 outline-none transition-colors shadow-xs"
                        />
                        {(photoTxQuery || photoTxId) && (
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoTxId("");
                              setPhotoTxQuery("");
                              setTxSuggestionsOpen(false);
                            }}
                            title="Reset to Manual Inspection (Sandbox Mode)"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {txSuggestionsOpen && (() => {
                          const q = photoTxQuery.trim().toLowerCase();
                          const matches = transactions
                            .filter((t) => {
                              if (!q) return true;
                              return (
                                String(t.id || "").toLowerCase().includes(q) ||
                                String(t.item_name || "").toLowerCase().includes(q) ||
                                String(t.paypal_order_id || "").toLowerCase().includes(q) ||
                                String(t.tracking_number || "").toLowerCase().includes(q) ||
                                String(t.status || "").toLowerCase().includes(q)
                              );
                            })
                            .slice(0, 8);

                          return (
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-2xl bg-white border border-[#e5e0fa] shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setPhotoTxId("");
                                  setPhotoTxQuery("");
                                  setTxSuggestionsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-[11px] font-mono border-b border-slate-100 flex items-center justify-between hover:bg-[#f7f5fe] ${
                                  !photoTxId ? "bg-[#f3efff] text-[#6d28d9] font-semibold" : "text-slate-600"
                                }`}
                              >
                                <span>Manual Inspection (Sandbox Mode)</span>
                                <span className="text-[10px] text-slate-400">Unbound</span>
                              </button>

                              {matches.length === 0 ? (
                                <div className="px-3 py-2.5 text-[11px] text-slate-400 font-mono">
                                  No order matches &quot;{photoTxQuery}&quot;
                                </div>
                              ) : (
                                matches.map((t) => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setPhotoTxId(t.id);
                                      setPhotoTxQuery(t.id);
                                      setTxSuggestionsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 border-b border-slate-100 last:border-b-0 hover:bg-[#f7f5fe] flex items-center justify-between gap-2 ${
                                      photoTxId === t.id ? "bg-violet-50" : ""
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 text-[11px] font-mono">
                                        <span className="font-bold text-[#6d28d9]">{t.id}</span>
                                        <span className="text-slate-400 truncate">
                                          {t.paypal_order_id ? `PP:${t.paypal_order_id}` : t.tracking_number || ""}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-800 font-medium truncate">{t.item_name}</p>
                                    </div>
                                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 shrink-0">
                                      {t.status}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {(() => {
                        const boundTx = transactions.find(
                          (t) => t.id === (photoTxId || visionResult?.transaction_id)
                        );
                        if (boundTx) {
                          return (
                            <div className="mt-2 rounded-xl bg-white border border-[#ebe6fa] px-3 py-2 text-[10px] font-mono space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500">
                                  Order: <strong className="text-[#6d28d9]">{boundTx.id}</strong>
                                </span>
                                <span className="text-slate-400 truncate">
                                  Track: {boundTx.tracking_number || "Pending"}
                                </span>
                              </div>
                              <div className="text-slate-600 truncate">
                                Item: <span className="text-slate-900 font-semibold">{boundTx.item_name}</span>
                              </div>
                            </div>
                          );
                        }
                        if (photoTxQuery.trim()) {
                          return (
                            <p className="mt-1.5 text-[10px] font-mono text-amber-700">
                              Select a matching order above or enter the full TX ID to bind escrow.
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <label className="group relative flex flex-col items-center justify-center gap-2.5 border-2 border-dashed border-[#d8cffc] hover:border-[#7c3aed] rounded-2xl bg-white h-44 cursor-pointer overflow-hidden transition-all p-3">
                      <div className="pointer-events-none absolute -top-10 h-24 w-44 rounded-full bg-violet-500/5 blur-2xl group-hover:bg-violet-500/15 transition-colors" />
                      {photoPreviewUrl ? (
                        <img
                          src={photoPreviewUrl}
                          alt="Uploaded parcel proof"
                          className="relative z-10 w-full h-full object-contain rounded-xl"
                        />
                      ) : (
                        <>
                          <div className="relative z-10 w-10 h-10 rounded-2xl bg-[#f3efff] border border-[#e2d6fe] group-hover:border-[#7c3aed] flex items-center justify-center transition-colors">
                            <Upload className="w-4 h-4 text-[#6d28d9]" />
                          </div>
                          <span className="relative z-10 text-xs font-semibold text-slate-800">
                            Select delivery photo
                          </span>
                          <span className="relative z-10 text-[10px] font-mono text-slate-400">
                            JPG, PNG, or WEBP
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoFileSelected(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>

                  <div className="pt-3 border-t border-[#ebe6fa] flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 text-[11px] text-slate-500 truncate">
                      {isAlreadySettled ? (
                        <span className={`font-mono font-semibold inline-flex items-center gap-1.5 ${
                          isSettledProtected || boundTx?.status === "VOIDED" || boundTx?.status === "DISPUTED"
                            ? "text-rose-600"
                            : "text-emerald-700"
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {isSettledProtected || boundTx?.status === "VOIDED" || boundTx?.status === "DISPUTED"
                              ? "Escrow Protected • Hold Voided"
                              : "Verified & Paid • Settled on PayPal"}
                          </span>
                        </span>
                      ) : isMismatchRetryPending ? (
                        <span className="font-mono font-semibold text-amber-700 inline-flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Mismatch {mismatchAttempts}/{maxMismatchAttempts} • Hold Intact ({attemptsRemaining} retry left)
                          </span>
                        </span>
                      ) : selectedPhotoFile ? (
                        <span className="font-mono text-slate-700">
                          {selectedPhotoFile.name} ({Math.max(1, Math.round(selectedPhotoFile.size / 1024))} KB)
                        </span>
                      ) : (
                        <span>No image selected</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {isAlreadySettled ? (
                        <>
                          <button
                            type="button"
                            onClick={resetVisionWorkspace}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#f7f5fe] border border-slate-200 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                          >
                            Next Order
                          </button>
                          {boundTx && (
                            <button
                              type="button"
                              onClick={() => openTxInspector(boundTx, "vision")}
                              className="px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-[11px] font-semibold text-[#6d28d9] inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Receipt &amp; POD</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setOrderFilter("all");
                              setActiveTab("orders");
                            }}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#8b5cf6] hover:to-[#6366f1] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-[0_6px_16px_rgba(109,40,217,0.26)] transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Open Orders</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {selectedPhotoFile && (
                            <button
                              type="button"
                              onClick={() => handlePhotoFileSelected(null)}
                              disabled={loading}
                              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600 transition-colors"
                            >
                              Clear
                            </button>
                          )}
                          <button
                            onClick={() => handleInspectRealPhoto()}
                            disabled={loading || !selectedPhotoFile}
                            className={`px-4 py-2 rounded-xl disabled:opacity-45 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                              isMismatchRetryPending
                                ? "bg-amber-500 hover:bg-amber-400 shadow-sm"
                                : "bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#8b5cf6] hover:to-[#6366f1] shadow-[0_6px_16px_rgba(109,40,217,0.28)]"
                            }`}
                          >
                            {isInspecting ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Calling APIs...</span>
                              </>
                            ) : isMismatchRetryPending ? (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>Retry Vision Check ({attemptsRemaining} left)</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>Run Vision Check</span>
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT DIV: AUDIT TRAIL & ESCROW VERIFICATION */}
              <div className="w-full h-full surface-card hover:border-violet-300 rounded-[26px] p-4 flex flex-col transition-all">
                <div className="flex items-center justify-between gap-2 px-1.5 mb-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#f3efff] border border-[#e2d6fe] flex items-center justify-center shrink-0">
                      <AuroraShieldLogo className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                        Audit Trail &amp; Escrow
                      </h2>
                      <p className="text-[11px] text-slate-500 truncate">
                        Real-time cryptographic and visual verification
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-tight shrink-0 ${
                      isInspecting
                        ? "bg-violet-50 text-[#6d28d9] border border-violet-200"
                        : chainPassed
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : isMismatchRetryPending
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : chainFailed
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-[#f5f3ff] text-slate-500 border border-[#e5e0fa]"
                    }`}
                  >
                    {ins?.model ? ins.model : isInspecting ? "SCANNING" : chainPassed ? "VERIFIED" : isMismatchRetryPending ? `RETRY ${mismatchAttempts}/${maxMismatchAttempts}` : chainFailed ? "FLAGGED" : "STANDBY"}
                  </span>
                </div>

                <div className="bg-[#faf9ff] rounded-3xl p-4 sm:p-5 border border-[#ede9fe] flex-1 flex flex-col justify-between gap-4">
                  {/* LIVE MULTI-API CALL PIPELINE BAR */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { step: 1, label: "SHA-256 Hash", sub: "Evidence" },
                      { step: 2, label: "AI Vision", sub: "POD Scan" },
                      { step: 3, label: "Ledger Chain", sub: "Guardrails" },
                      { step: 4, label: "PayPal API", sub: isMismatchRetryPending ? "Hold Kept" : chainFailed ? "Void" : "Capture" },
                    ].map((s) => {
                      const isDone = activePipelineStep === 4 || (activePipelineStep > s.step && isInspecting);
                      const isActive = isInspecting && activePipelineStep === s.step;
                      return (
                        <div
                          key={s.step}
                          className={`rounded-xl border px-2.5 py-2 transition-all ${
                            isActive
                              ? "bg-violet-50 border-violet-300 shadow-xs"
                              : isDone
                              ? isMismatchRetryPending && s.step === 4
                                ? "bg-amber-50 border-amber-200"
                                : chainFailed && s.step === 4
                                ? "bg-rose-50 border-rose-200"
                                : "bg-emerald-50 border-emerald-200"
                              : "bg-white border-[#ebe6fa] opacity-80"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[9px] font-mono text-slate-400">0{s.step}</span>
                            {isActive ? (
                              <Loader2 className="w-3 h-3 text-[#6d28d9] animate-spin" />
                            ) : isDone ? (
                              isMismatchRetryPending && s.step === 4 ? (
                                <Lock className="w-3 h-3 text-amber-600" />
                              ) : (
                                <CheckCircle2
                                  className={`w-3 h-3 ${
                                    chainFailed && s.step === 4 ? "text-rose-600" : "text-emerald-600"
                                  }`}
                                />
                              )
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            )}
                          </div>
                          <p
                            className={`text-[10px] font-bold truncate ${
                              isActive ? "text-[#6d28d9]" : isDone ? "text-slate-900" : "text-slate-500"
                            }`}
                          >
                            {s.label}
                          </p>
                          <p className="text-[9px] font-mono text-slate-400 truncate">{s.sub}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* TWO DYNAMIC STATUS BLOCKS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Block 1: Cryptographic Ledger Check */}
                    <div
                      className={`rounded-2xl border p-3.5 space-y-2 transition-colors ${
                        isInspecting
                          ? "bg-violet-50 border-violet-200"
                          : chainPassed
                          ? "bg-emerald-50 border-emerald-200"
                          : isMismatchRetryPending
                          ? "bg-amber-50 border-amber-200"
                          : chainFailed
                          ? "bg-rose-50 border-rose-200"
                          : "bg-white border-[#ebe6fa]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                          Cryptographic Ledger Check
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            isInspecting
                              ? "bg-violet-100 text-[#6d28d9]"
                              : chainPassed
                              ? "bg-emerald-100 text-emerald-700"
                              : isMismatchRetryPending
                              ? "bg-amber-100 text-amber-800"
                              : chainFailed
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isInspecting
                            ? "CHECKING"
                            : chainPassed
                            ? "PASS • GREEN"
                            : isMismatchRetryPending
                            ? `RETRY • ${mismatchAttempts}/${maxMismatchAttempts}`
                            : chainFailed
                            ? "FAIL • RED"
                            : "IDLE"}
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        {isInspecting ? (
                          <Loader2 className="w-4 h-4 text-[#6d28d9] animate-spin shrink-0 mt-0.5" />
                        ) : chainPassed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : isMismatchRetryPending ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        ) : chainFailed ? (
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        ) : (
                          <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 space-y-0.5">
                          <p
                            className={`text-xs font-semibold truncate ${
                              chainPassed
                                ? "text-emerald-900"
                                : isMismatchRetryPending
                                ? "text-amber-900"
                                : chainFailed
                                ? "text-rose-900"
                                : "text-slate-800"
                            }`}
                          >
                            {isInspecting
                              ? "Matching Order No & Hashing..."
                              : hasResult
                              ? `${
                                  ins?.order_context?.order_id
                                    ? `${ins.order_context.order_id}: `
                                    : visionResult?.auto_matched_order_id
                                    ? `${visionResult.auto_matched_order_id}: `
                                    : ""
                                }${analysis.verdict}`
                              : "Order No + SHA-256 Chain"}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 truncate">
                            {hasResult && analysis?.detected_item
                              ? `Seen: ${analysis.detected_item} • ${
                                  analysis.item_matches_order === false
                                    ? "ITEM MISMATCH"
                                    : analysis.order_no_match_status || "MATCHED"
                                }`
                              : ins?.photo_sha256
                              ? `Hash: ${ins.photo_sha256}`
                              : "Awaiting delivery image bytes"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Block 2: Escrow Settlement Status */}
                    <div
                      className={`rounded-2xl border p-3.5 space-y-2 transition-colors ${
                        isInspecting
                          ? "bg-violet-50 border-violet-200"
                          : chainPassed
                          ? "bg-emerald-50 border-emerald-200"
                          : isMismatchRetryPending
                          ? "bg-amber-50 border-amber-200"
                          : chainFailed
                          ? "bg-rose-50 border-rose-200"
                          : "bg-white border-[#ebe6fa]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                          Escrow Settlement Status
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            isInspecting
                              ? "bg-violet-100 text-[#6d28d9]"
                              : chainPassed
                              ? "bg-emerald-100 text-emerald-700"
                              : isMismatchRetryPending
                              ? "bg-amber-100 text-amber-800"
                              : chainFailed
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isInspecting
                            ? "PENDING"
                            : isSettledCaptured
                            ? "CAPTURED"
                            : isSettledProtected
                            ? visionResult.status
                            : isMismatchRetryPending
                            ? `HOLD KEPT (${attemptsRemaining} LEFT)`
                            : chainPassed
                            ? "RELEASE READY"
                            : chainFailed
                            ? "VOID / DISPUTE"
                            : "STANDBY"}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <p
                            className={`text-xs font-semibold ${
                              chainPassed
                                ? "text-emerald-900"
                                : isMismatchRetryPending
                                ? "text-amber-900"
                                : chainFailed
                                ? "text-rose-900"
                                : "text-slate-800"
                            }`}
                          >
                            {isInspecting
                              ? "Evaluating settlement path..."
                              : isSettledCaptured
                              ? "Escrow Released to Seller"
                              : isSettledProtected
                              ? "Buyer Protected (Hold Cancelled)"
                              : isMismatchRetryPending
                              ? "PayPal Hold Intact • Retry Window"
                              : chainPassed
                              ? "Eligible for PayPal Capture"
                              : chainFailed
                              ? "Escrow Frozen • Auto-Protect"
                              : "Release on Pass / Protect on Fail"}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {isSettledCaptured
                              ? `Capture ID: ${visionResult.paypal_capture_id || "Confirmed"}`
                              : visionResult?.auto_settle_error
                              ? visionResult.auto_settle_error
                              : isMismatchRetryPending
                              ? `Upload correct POD (${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} left) or void manually`
                              : chainPassed
                              ? photoTxId
                                ? "Authorized hold ready to settle"
                                : "Select an Authorized order to auto-settle"
                              : chainFailed
                              ? "Void hold or open PayPal dispute"
                              : "Follows Gemini Vision + chain outcome"}
                          </p>
                        </div>

                        {chainPassed && photoTxId && !isSettledCaptured && (
                          <button
                            type="button"
                            onClick={() => handleCaptureFunds(photoTxId)}
                            disabled={loading}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shrink-0"
                          >
                            Capture
                          </button>
                        )}
                        {(chainFailed || isMismatchRetryPending) && (photoTxId || boundTx?.id) && !isSettledProtected && (
                          <button
                            type="button"
                            onClick={() => handleVoidOrDispute(photoTxId || boundTx.id)}
                            disabled={loading}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shrink-0"
                          >
                            {isMismatchRetryPending ? "Void Hold Now" : "Void Hold"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* FORENSIC METRICS GRID + OBSERVATIONS OR EMPTY STATE */}
                  {hasResult ? (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="bg-white border border-[#ebe6fa] rounded-2xl p-3">
                          <span className="text-[10px] text-slate-400 block">Integrity</span>
                          <span className={`text-base font-bold ${chainPassed ? "text-emerald-700" : "text-rose-600"}`}>
                            {(Number(analysis.integrity_score || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="bg-white border border-[#ebe6fa] rounded-2xl p-3">
                          <span className="text-[10px] text-slate-400 block">Deformation</span>
                          <span className="text-base font-bold text-slate-900">
                            {(Number(analysis.deformation_score || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="bg-white border border-[#ebe6fa] rounded-2xl p-3">
                          <span className="text-[10px] text-slate-400 block">Condition</span>
                          <span className="text-xs font-mono font-semibold text-slate-800 truncate block mt-1" title={analysis.condition}>
                            {analysis.condition}
                          </span>
                        </div>
                      </div>

                      {Array.isArray(analysis.vision_reasoning) && (
                        <div className="bg-white border border-[#ebe6fa] rounded-2xl p-3.5 space-y-1">
                          <span className="text-[11px] text-slate-500 font-medium block">AI Forensic Observations</span>
                          <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-700">
                            {analysis.vision_reasoning.map((r: string, i: number) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d8cffc] bg-white/80 px-5 py-7 text-center">
                      <div className="w-9 h-9 rounded-full bg-[#f3efff] border border-[#e2d6fe] flex items-center justify-center mb-2.5">
                        <Sparkles className="w-4 h-4 text-[#7c3aed]" />
                      </div>
                      <p className="text-xs text-slate-800 font-semibold tracking-tight">Awaiting visual input...</p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                        Select a Target Escrow Order and drop a parcel photo on the left to trigger cryptographic + AI Vision verification.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ==================== TAB 4: MANDATE & SAFEGUARDS (2-COLUMN PC) ==================== */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-6 surface-card p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Corporate Spending Mandate &amp; Wallet</h2>
                  <p className="text-xs text-slate-500">Deterministic rules enforced before PayPal order creation</p>
                </div>
                <button
                  onClick={() => setIsSetAmountModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#f3efff] hover:bg-[#e9e2ff] border border-[#e2d6fe] text-xs font-semibold text-[#6d28d9] shrink-0"
                >
                  Edit Pool &amp; Cap
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="surface-card-subtle p-4">
                  <span className="text-slate-500 block">Escrow Pool Balance</span>
                  <span className="text-lg font-extrabold text-slate-900 mt-1 block tabular-nums">{formatMoney(mandate.remaining_pool)}</span>
                </div>
                <div className="surface-card-subtle p-4">
                  <span className="text-slate-500 block">Max Single Spend</span>
                  <span className="text-lg font-extrabold text-slate-900 mt-1 block tabular-nums">{formatMoney(mandate.max_single_spend)}</span>
                </div>
              </div>

              <div className="surface-card-subtle p-4 text-xs space-y-2.5">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Allowed Categories</span>
                  <span className="font-mono font-semibold text-slate-800">{mandate.allowed_categories}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Circuit Breaker</span>
                  <span className={killSwitchStatus.is_locked_down ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>
                    {killSwitchStatus.is_locked_down ? "LOCKED DOWN" : "ARMED & HEALTHY"}
                  </span>
                </div>
              </div>
            </div>

            <div className="md:col-span-6 surface-card p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Dual-Agent Maker-Checker &amp; PayPal Profile</h2>
                  <p className="text-xs text-slate-500">Air-gapped auditor signing and delegated PayPal buyer account</p>
                </div>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#f8f7fc] border border-slate-200 hover:border-violet-200 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#6d28d9]" />
                  <span>PayPal Profile</span>
                </button>
              </div>

              <div className="surface-card-subtle p-4 text-xs space-y-2.5">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Connected Buyer</span>
                  <span className="font-mono font-semibold text-slate-900">{connectedAccount?.email || "Not Linked"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Payer ID</span>
                  <span className="font-mono text-slate-500">{connectedAccount?.payer_id || "—"}</span>
                </div>
              </div>

              <button
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  setBusyAction("maker-checker");
                  setNotice({ status: "LOADING", title: "Verifying Maker-Checker Signature", message: "Signing & auditing dual-agent mandate via HMAC-SHA256..." });
                  try {
                    const res = await fetch(`${API_BASE}/api/maker-checker/propose-and-audit`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        item_name: "Dell Laptop",
                        category: "electronics",
                        amount: 50000.0,
                        merchant: "Dell Technologies",
                      }),
                    });
                    const data = await res.json();
                    setMakerCheckerRes(data);
                    setNotice({
                      status: res.ok ? "SUCCESS" : "ERROR",
                      title: `Maker-Checker: ${data.status || "Completed"}`,
                      message: data?.audit?.cryptographic_signature
                        ? `Signed with ${data.audit.cryptographic_signature.slice(0, 32)}...`
                        : "Audit completed.",
                    });
                  } catch (e: any) {
                    setNotice({ status: "ERROR", title: "Maker-Checker Error", message: e?.message || "Request failed." });
                  } finally {
                    setLoading(false);
                    setBusyAction(null);
                  }
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#8b5cf6] hover:to-[#6366f1] disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(109,40,217,0.3)]"
              >
                {busyAction === "maker-checker" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying HMAC Signature...</span>
                  </>
                ) : (
                  <span>Verify Dual-Agent Maker-Checker Signature (/api/maker-checker)</span>
                )}
              </button>

              {makerCheckerRes && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs font-mono text-emerald-800 space-y-1">
                  <div className="font-semibold">Status: {makerCheckerRes.status}</div>
                  {makerCheckerRes.audit?.cryptographic_signature && (
                    <div className="truncate text-emerald-700">HMAC: {makerCheckerRes.audit.cryptographic_signature}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* CHECKOUT CONFIRMATION MODAL */}
      {checkoutProduct && (
        <div className="fixed inset-0 z-[60] bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain">
          <div className="bg-white border border-[#e5e0fa] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm PayPal Smart Escrow</h3>
                <p className="text-xs text-slate-500 mt-0.5">{checkoutProduct.merchant}</p>
              </div>
              <button onClick={() => setCheckoutProduct(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#f8f7fc] border border-[#ebe6fa] rounded-xl p-4 space-y-2 text-xs">
              <div className="font-bold text-sm text-slate-900">{checkoutProduct.name}</div>
              <div className="text-slate-600">{checkoutProduct.description}</div>
              <div className="pt-2 border-t border-[#ebe6fa] flex items-center justify-between">
                <span className="text-slate-500">Escrow Hold Amount</span>
                <span className="text-base font-extrabold text-slate-900">{formatMoney(checkoutProduct.amount)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCheckoutProduct(null)}
                className="flex-1 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBuyItem(checkoutProduct)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#8b5cf6] hover:to-[#6366f1] disabled:opacity-60 text-xs font-semibold text-white flex items-center justify-center gap-1.5 shadow-[0_6px_16px_rgba(109,40,217,0.25)]"
              >
                {busyAction === `buy:${checkoutProduct.id}` ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Escrow Order...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Create Escrow Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING VIEWPORT STATUS TOAST (VISIBLE WHILE SCROLLED ANYWHERE) */}
      {notice && (
        <div
          className={`fixed bottom-5 right-5 z-[60] max-w-sm w-full rounded-2xl border px-4 py-3 shadow-xl backdrop-blur flex items-start justify-between gap-3 text-xs transition-all ${
            notice.status === "SUCCESS" || notice.status === "CAPTURED"
              ? "bg-white/95 border-emerald-200 text-emerald-950"
              : notice.status === "BLOCKED" || notice.status === "ERROR" || notice.status === "DISPUTED"
              ? "bg-white/95 border-rose-200 text-rose-950"
              : notice.status === "LOADING"
              ? "bg-white/95 border-violet-200 text-violet-950"
              : "bg-white/95 border-[#ece8f8] text-slate-900"
          }`}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            {notice.status === "LOADING" ? (
              <Loader2 className="w-4 h-4 text-violet-600 animate-spin shrink-0 mt-0.5" />
            ) : notice.status === "SUCCESS" || notice.status === "CAPTURED" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5 min-w-0">
              <p className="font-semibold text-xs truncate">{notice.title || notice.status}</p>
              <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">{notice.message}</p>
            </div>
          </div>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-700 p-0.5 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* EXISTING WORKING MODALS */}
      <SetAmountModal
        isOpen={isSetAmountModalOpen}
        onClose={() => setIsSetAmountModalOpen(false)}
        currency={currency}
        onSetCurrency={setCurrency}
        currentBalance={mandate.remaining_pool}
        currentMaxSpend={mandate.max_single_spend}
        onSave={handleSaveBudget}
        loading={loading}
      />

      <CustomProcureModal
        isOpen={isCustomProcureOpen}
        onClose={() => setIsCustomProcureOpen(false)}
        currency={currency}
        maxSingleSpendInr={mandate.max_single_spend}
        remainingBudgetInr={mandate.remaining_pool}
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
          setIsCustomProcureOpen(false);
        }}
        loading={loading}
      />

      <PayPalAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        connectedAccount={connectedAccount}
        onConnect={async (account) => {
          const res = await fetch(`${API_BASE}/api/paypal/connect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(account),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data?.detail?.message || data?.message || "PayPal OAuth verification failed.");
          }
          setConnectedAccount(data);
          await fetchData();
        }}
        onDisconnect={async () => {
          setConnectedAccount(null);
          await fetch(`${API_BASE}/api/paypal/disconnect`, { method: "POST" });
        }}
      />

      <AuditModal
        isOpen={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        tx={selectedTx}
        formatMoney={formatMoney}
        initialTab={selectedTxTab}
        savedPhotoUrl={
          selectedTx
            ? orderPhotos[selectedTx.id]?.previewUrl ||
              (selectedTx.vision_evidence_url
                ? String(selectedTx.vision_evidence_url).startsWith("http")
                  ? String(selectedTx.vision_evidence_url)
                  : `${API_BASE}${selectedTx.vision_evidence_url}`
                : undefined)
            : undefined
        }
      />

      <SettlementFlowModal
        flow={settlementFlow}
        formatTxMoney={formatTxMoney}
        onClose={() => setSettlementFlow(null)}
        onOpenReceipt={(flowTx) => {
          const latestTx = transactions.find((t) => t.id === flowTx.id) || flowTx;
          setSettlementFlow(null);
          openTxInspector(latestTx, "paypal");
        }}
      />

      {/* FLOATING RIGHT-EDGE CURVED DOCK + CLICK-TO-OPEN STUNNING AI BUY DRAWER */}
      {!hasOpenModal && (
        <EdgeDockRail
          isBuyPanelOpen={isEdgeBuyOpen}
          onToggleBuyPanel={(open) => {
            const next = typeof open === "boolean" ? open : !isEdgeBuyOpen;
            if (next) {
              setIsCustomProcureOpen(false);
              setIsAuthModalOpen(false);
              setIsSetAmountModalOpen(false);
              setCheckoutProduct(null);
              setSelectedTx(null);
            }
            setIsEdgeBuyOpen(next);
          }}
          onOpenSettings={() => {
            setIsEdgeBuyOpen(false);
            setIsSetAmountModalOpen(true);
          }}
          onOpenCustomOrder={() => {
            setIsEdgeBuyOpen(false);
            setIsCustomProcureOpen(true);
          }}
          onOpenVisionLab={() => {
            setIsEdgeBuyOpen(false);
            setActiveTab("vision");
          }}
          onGoToOrders={() => {
            setIsEdgeBuyOpen(false);
            setActiveTab("orders");
          }}
          agentPrompt={agentPrompt}
          onChangeAgentPrompt={setAgentPrompt}
          onRunGeminiAgent={handleRunGeminiAgent}
          agentRunResult={agentRunResult}
          loading={loading}
          busyAction={busyAction}
          remainingBudget={mandate.remaining_pool}
          totalPool={mandate.total_pool || 250000}
          maxSingleSpend={mandate.max_single_spend}
          formatMoney={formatMoney}
        />
      )}
    </div>
  );
}
