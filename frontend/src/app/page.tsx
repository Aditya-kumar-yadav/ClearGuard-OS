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
} from "lucide-react";
import confetti from "canvas-confetti";
import { Product } from "@/components/ProductCatalog";
import { PayPalAuthModal } from "@/components/PayPalAuthModal";
import { SetAmountModal } from "@/components/SetAmountModal";
import { CustomProcureModal } from "@/components/CustomProcureModal";
import { AuditModal } from "@/components/AuditModal";
import { SettlementFlowModal, SettlementFlowState } from "@/components/SettlementFlowModal";
import { EdgeDockRail } from "@/components/EdgeDockRail";
import { PayPalLogo, GeminiLogo, VisionLensLogo, AuroraShieldLogo } from "@/components/BrandLogos";
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
        } else if (data?.auto_settled) {
          setNotice({
            status: "DISPUTED",
            title: `Vision Flagged Damage → PayPal ${data.status}`,
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
    setNotice({ status: "LOADING", title: "Gemini Agent Executing", message: "Parsing request with Google Gemini & running OpenGuardrails..." });
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
            title: "Gemini Agent → PayPal Order Created",
            message: `${data?.agent?.analysis?.item_name} submitted to PayPal Orders v2 (${data?.order?.paypal_order_id}).`,
          });
        } else {
          setNotice({
            status: "BLOCKED",
            title: `Gemini Agent: ${data.status}`,
            message: data?.guardrail_detail?.message || data?.guardrail_detail?.reason || "Blocked by policy guardrails.",
          });
        }
      } else {
        setNotice({
          status: "BLOCKED",
          title: "Gemini Agent Error",
          message: data?.detail?.message || data?.message || "Gemini Agent request failed.",
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
    if (cat === "luxury") return <Watch className="w-5 h-5 text-rose-400" />;
    if (cat === "cloud") return <Server className="w-5 h-5 text-sky-400" />;
    if (cat === "hardware") return <Cpu className="w-5 h-5 text-amber-400" />;
    if (cat === "office") return <Briefcase className="w-5 h-5 text-indigo-400" />;
    if (id === "PROD-001") return <Smartphone className="w-5 h-5 text-emerald-400" />;
    return <Laptop className="w-5 h-5 text-emerald-400" />;
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
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans flex flex-col">
      {/* Circuit Breaker Alert Banner */}
      {killSwitchStatus.is_locked_down && (
        <div className="bg-rose-950/90 border-b border-rose-500/60 px-6 py-2.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-rose-200">
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>SECURITY LOCKDOWN ACTIVE — ALL AGENT PROCUREMENT FROZEN</span>
          </div>
          <button
            onClick={async () => {
              await fetch(`${API_BASE}/api/kill-switch/reset`, { method: "POST" });
              await fetchData();
            }}
            className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-semibold"
          >
            Disarm Lock
          </button>
        </div>
      )}

      {/* Network Anomaly Toast */}
      {anomalyToast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-[#18181b] border border-rose-500/70 rounded-xl p-4 shadow-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-semibold text-rose-300">Circuit Breaker Engaged</p>
            <p className="text-zinc-300 mt-0.5">{anomalyToast}</p>
          </div>
          <button onClick={() => setAnomalyToast(null)} className="text-zinc-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* GLOBAL TOP LOADING PROGRESS BAR */}
      {loading && (
        <div className="fixed top-0 inset-x-0 z-[70] h-[3px] bg-zinc-900 overflow-hidden pointer-events-none">
          <div className="h-full w-1/3 bg-gradient-to-r from-emerald-500 via-sky-400 to-emerald-400 animate-loading-bar" />
        </div>
      )}

      {/* PC DESKTOP TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-[#09090b]/95 border-b border-zinc-800/80">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Left: Brand + Primary Desktop Navigation */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <AuroraShieldLogo className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-tight text-white">AuroraPay</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                    ClearGuard OS
                  </span>
                </div>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
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
                    className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
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
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setCurrency(currency === "USD" ? "INR" : "USD")}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-200 transition-colors"
              title="Switch display and order currency"
            >
              {currency}
            </button>

            <button
              onClick={() => setIsSetAmountModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 hidden sm:flex items-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
              <span>Limits</span>
            </button>

            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 flex items-center gap-1.5 transition-colors"
            >
              <PayPalLogo className="w-3.5 h-3.5 shrink-0" />
              <span className={`w-1.5 h-1.5 rounded-full ${connectedAccount ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span>{connectedAccount ? "PayPal Linked" : "Connect PayPal"}</span>
            </button>

            <button
              onClick={() => setIsCustomProcureOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Custom Order</span>
            </button>
          </div>
        </div>

        {/* Mobile Secondary Tab Strip */}
        <div className="md:hidden border-t border-zinc-800/80 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {[
            { id: "overview", label: "Catalog" },
            { id: "orders", label: `Orders (${transactions.length})` },
            { id: "vision", label: "Vision Dashboard" },
            { id: "settings", label: "Safeguards" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavSection)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                activeTab === item.id ? "bg-zinc-800 text-white" : "text-zinc-400"
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
          <div className="bg-[#111114] border border-zinc-800/90 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Escrow Pool Remaining</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-white tabular-nums">{formatMoney(mandate.remaining_pool)}</span>
              <span className="text-[11px] font-mono text-zinc-400">{poolUsagePct}% avail</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${poolUsagePct}%` }} />
            </div>
          </div>

          <div className="bg-[#111114] border border-zinc-800/90 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Per-Order Cap</span>
              <Shield className="w-4 h-4 text-sky-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-white tabular-nums">{formatMoney(mandate.max_single_spend)}</span>
              <button
                onClick={() => setIsSetAmountModalOpen(true)}
                className="text-[11px] text-sky-400 hover:underline font-medium"
              >
                Adjust
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 truncate">Allowed: {mandate.allowed_categories}</p>
          </div>

          <div className="bg-[#111114] border border-zinc-800/90 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Escrow Pipeline</span>
              <ShoppingBag className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-4">
              <div>
                <span className="text-xl font-bold text-white tabular-nums">{authorizedCount}</span>
                <span className="text-xs text-zinc-400 ml-1">Authorized</span>
              </div>
              <div>
                <span className="text-xl font-bold text-amber-300 tabular-nums">{pendingCount}</span>
                <span className="text-xs text-zinc-400 ml-1">Pending</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("orders")}
              className="text-[11px] text-zinc-300 hover:text-white inline-flex items-center gap-1"
            >
              <span>Manage orders</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-[#111114] border border-zinc-800/90 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Live Backend &amp; APIs</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealth.status === "ONLINE" ? "bg-emerald-400" : "bg-rose-500"
                }`}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                  backendHealth.status === "ONLINE"
                    ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-950/50 border-rose-500/30 text-rose-300"
                }`}
              >
                API :8000 {backendHealth.status}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                  backendHealth.paypal_configured
                    ? "bg-sky-950/50 border-sky-500/30 text-sky-300"
                    : "bg-amber-950/50 border-amber-500/30 text-amber-300"
                }`}
              >
                PayPal: {backendHealth.paypal_configured ? "Ready" : "Missing"}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                  backendHealth.gemini_configured
                    ? "bg-purple-950/50 border-purple-500/30 text-purple-300"
                    : "bg-amber-950/50 border-amber-500/30 text-amber-300"
                }`}
              >
                Gemini: {backendHealth.gemini_configured ? "Ready" : "Missing"}
              </span>
            </div>
            {(!backendHealth.paypal_configured || !backendHealth.gemini_configured) && (
              <p className="text-[11px] text-zinc-400">Add missing keys in <code className="text-zinc-300">.env</code></p>
            )}
          </div>
        </section>

        {/* INLINE ACTION NOTICE */}
        {notice && (
          <div
            className={`rounded-xl border px-4 py-3 flex items-start justify-between gap-4 text-xs transition-all ${
              notice.status === "SUCCESS" || notice.status === "CAPTURED"
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                : notice.status === "BLOCKED" || notice.status === "ERROR" || notice.status === "DISPUTED"
                ? "bg-rose-950/30 border-rose-500/40 text-rose-200"
                : notice.status === "LOADING"
                ? "bg-sky-950/30 border-sky-500/40 text-sky-100"
                : "bg-[#111114] border-zinc-800 text-zinc-200"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {notice.status === "LOADING" && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0 mt-0.5" />}
              <div className="space-y-0.5">
                <p className="font-semibold text-sm">{notice.title || notice.status}</p>
                <p className="text-zinc-300">{notice.message}</p>
              </div>
            </div>
            <button onClick={() => setNotice(null)} className="text-zinc-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ==================== TAB 1: OVERVIEW & CATALOG ==================== */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Columns: Product Catalog */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-[#111114] border border-zinc-800/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        categoryFilter === pill.id
                          ? "bg-zinc-100 text-zinc-900"
                          : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter catalog..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map((product) => {
                  const isPolicyTest = product.category === "luxury";
                  return (
                    <div
                      key={product.id}
                      className="bg-[#111114] border border-zinc-800/90 hover:border-zinc-700 rounded-xl p-5 flex flex-col justify-between gap-4 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                            {getProductIcon(product.category, product.id)}
                          </div>
                          <span
                            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                              isPolicyTest
                                ? "bg-rose-950/40 text-rose-300 border-rose-500/30"
                                : "bg-zinc-900 text-zinc-400 border-zinc-800"
                            }`}
                          >
                            {isPolicyTest ? "Restricted Category" : product.category}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-white">{product.name}</h3>
                          <p className="text-xs text-zinc-400 mt-0.5">{product.merchant}</p>
                        </div>

                        <p className="text-xs text-zinc-400 leading-relaxed">{product.description}</p>
                      </div>

                      <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-zinc-500 block">Escrow Hold</span>
                          <span className={`text-base font-bold tabular-nums ${isPolicyTest ? "text-rose-400" : "text-white"}`}>
                            {formatMoney(product.amount)}
                          </span>
                        </div>

                        <button
                          onClick={() => setCheckoutProduct(product)}
                          disabled={loading}
                          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                            isPolicyTest
                              ? "bg-rose-950/60 hover:bg-rose-900/70 text-rose-200 border border-rose-500/40"
                              : "bg-emerald-500 hover:bg-emerald-400 text-black"
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
              {/* Sleek Launcher Card (Triggers the Floating Edge AI Quick-Buy Panel) */}
              <button
                type="button"
                onClick={() => setIsEdgeBuyOpen((v) => !v)}
                className="w-full text-left group relative overflow-hidden bg-gradient-to-br from-[#12131a] via-[#111114] to-[#0c1412] border border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-4 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <GeminiLogo className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Gemini AI Auto-Buy</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                          Ready
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        Click or use the right-edge dock icon to buy with plain English
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </button>

              <div className="bg-[#111114] border border-zinc-800/90 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Recent Ledger Activity</h2>
                    <p className="text-[11px] text-zinc-400">Click any transaction to inspect SHA-256 &amp; Vision proof</p>
                  </div>
                  <button onClick={() => setActiveTab("orders")} className="text-xs text-sky-400 hover:underline shrink-0">
                    View all ({transactions.length})
                  </button>
                </div>
                <div className="divide-y divide-zinc-800/80">
                  {transactions.slice(0, 4).map((tx) => (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => setSelectedTx(tx)}
                      className="w-full py-2.5 px-2 -mx-2 rounded-lg hover:bg-zinc-900/80 flex items-center justify-between gap-2 text-xs text-left transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{tx.item_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-zinc-500">{tx.id}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              tx.status === "CAPTURED"
                                ? "bg-emerald-950/60 text-emerald-300"
                                : tx.status === "BLOCKED" || tx.status === "DISPUTED"
                                ? "bg-rose-950/60 text-rose-300"
                                : "bg-amber-950/60 text-amber-300"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-zinc-200 shrink-0">{formatTxMoney(tx)}</span>
                    </button>
                  ))}
                  {transactions.length === 0 && (
                    <p className="text-xs text-zinc-500 py-4 text-center">No transactions recorded yet.</p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* ==================== TAB 2: STACKED FULL-DETAIL ESCROW ORDER CARDS ==================== */}
        {activeTab === "orders" && (
          <div className="space-y-5">
            <div className="bg-[#111114] border border-zinc-800/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      orderFilter === f.id ? "bg-zinc-100 text-zinc-900" : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                Capture Photo first &rarr; Inspect Photo unlocks on Processed / Declined orders
              </span>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="bg-[#111114] border border-zinc-800/90 rounded-2xl py-14 text-center text-zinc-500 text-xs">
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
                    ? "bg-gradient-to-b from-[#113522] via-[#0b2618] to-[#081c11] border-[#1ed760]/70 shadow-[0_20px_50px_rgba(30,215,96,0.22)]"
                    : isAuthorized && visionPassed
                    ? "bg-[#141f19] border-[#1ed760]/50 shadow-[0_20px_50px_rgba(30,215,96,0.14)]"
                    : isBlocked
                    ? "bg-gradient-to-b from-[#201217] via-[#171216] to-[#121014] border-rose-500/35 hover:border-rose-500/55 shadow-[0_20px_50px_rgba(244,63,94,0.12)]"
                    : "bg-[#18191e] hover:border-zinc-700/90 border-[#2a2c34] shadow-[0_20px_50px_rgba(0,0,0,0.55)]";

                  const innerScreenClass = isCaptured
                    ? "bg-[#05140c] border-[#1ed760]/30"
                    : isBlocked
                    ? "bg-[#0d090c] border-rose-500/20"
                    : "bg-[#0a0b0e] border-white/[0.06]";

                  const telemetryBoxClass = isCaptured
                    ? "bg-[#092114] border-[#1ed760]/25"
                    : isBlocked
                    ? "bg-[#160d11] border-rose-500/20"
                    : "bg-[#121318] border-zinc-800/80";

                  const topAmountPillClass = isGreenTheme
                    ? "bg-[#1ed760] text-black shadow-[0_0_18px_rgba(30,215,96,0.32)]"
                    : isRedTheme
                    ? "bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.32)]"
                    : "bg-amber-400 text-black shadow-[0_0_16px_rgba(251,191,36,0.3)]";

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
                      className={`w-full h-full rounded-[28px] p-4 border flex flex-col transition-colors ${outerCardClass}`}
                    >
                      {/* Top Header — Brand / Order ID + Neon Amount Stored on Top */}
                      <div className="flex items-center justify-between gap-2 px-1.5 mb-3.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 ${
                              isCaptured
                                ? "bg-[#092114] border-[#1ed760]/40"
                                : "bg-zinc-900 border-zinc-800"
                            }`}
                          >
                            <PayPalLogo className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white tracking-wide block leading-none">
                              AuroraPay
                            </span>
                            <span
                              className={`text-[10px] font-mono truncate block mt-0.5 ${
                                isCaptured ? "text-emerald-300/80" : "text-zinc-500"
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
                            className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 bg-white/[0.04] text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/35 disabled:opacity-40 transition-colors cursor-pointer"
                          >
                            {busyAction === `delete:${tx.id}` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Inner Matte Card Screen */}
                      <div
                        className={`rounded-3xl p-4 sm:p-5 shadow-inner border flex-1 flex flex-col justify-between gap-4 ${innerScreenClass}`}
                      >
                        <div className="space-y-4">
                          {/* Status & Category Tag Bar */}
                          <div className="flex items-center justify-between gap-2">
                            <div
                              className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase ${
                                isGreenTheme
                                  ? "text-[#1ed760]"
                                  : isRedTheme
                                  ? "text-rose-400"
                                  : "text-amber-300"
                              }`}
                            >
                              <span>• {statusLabel}</span>
                              {isGreenTheme ? (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              ) : isRedTheme ? (
                                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 shrink-0" />
                              )}
                            </div>

                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border ${
                                isCaptured
                                  ? "bg-[#0b2a19] border-[#1ed760]/30 text-emerald-300"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400"
                              }`}
                            >
                              {tx.category || "electronics"}
                            </span>
                          </div>

                          {/* Product Thumbnail + Cart Item Title & Merchant */}
                          <div className="flex items-start gap-3.5">
                            {isBlocked ? (
                              <div
                                className="relative w-[68px] h-[68px] rounded-xl border border-rose-500/35 bg-rose-950/35 shrink-0 flex flex-col items-center justify-center cursor-default"
                                title="Blocked pre-purchase by OpenGuardrails — not dispatched or eligible for photo audit"
                              >
                                {getProductIcon(tx.category || "electronics", tx.id)}
                                <span className="text-[8px] font-mono mt-1 uppercase text-rose-300 font-semibold">
                                  Blocked
                                </span>
                              </div>
                            ) : savedEvidenceUrl && (hasSavedVisionProof || isCaptured) ? (
                              <button
                                type="button"
                                onClick={() => openTxInspector(tx, "vision")}
                                className={`relative w-[68px] h-[68px] rounded-xl border overflow-hidden shrink-0 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                                  isCaptured
                                    ? "bg-[#092114] border-[#1ed760]/70 hover:border-[#1ed760]"
                                    : "bg-[#121318] border-[#1ed760]/60 hover:border-sky-400"
                                }`}
                                title="Click to inspect saved POD photo and full order details"
                              >
                                <img
                                  src={savedEvidenceUrl}
                                  alt={tx.item_name}
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-mono text-[#1ed760] text-center py-0.5 uppercase">
                                  {savedVisionAnalysis?.integrity_score
                                    ? `POD ${Math.round(Number(savedVisionAnalysis.integrity_score) * 100)}%`
                                    : "POD Saved"}
                                </span>
                              </button>
                            ) : (
                              <label
                                className={`relative w-[68px] h-[68px] rounded-xl border overflow-hidden shrink-0 flex flex-col items-center justify-center transition-colors ${
                                  isCaptured
                                    ? "bg-[#092114] border-[#1ed760]/50"
                                    : hasCapturedPhoto
                                    ? "bg-[#121318] border-[#1ed760]/70"
                                    : isProcessedOrDeclined
                                    ? "bg-[#121318] border-zinc-700 hover:border-sky-400 cursor-pointer"
                                    : "bg-[#121318] border-zinc-800/90 opacity-75 cursor-not-allowed"
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
                                    <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-mono text-[#1ed760] text-center py-0.5 uppercase">
                                      Photo Ready
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    {getProductIcon(tx.category || "electronics", tx.id)}
                                    <span
                                      className={`text-[8px] font-mono mt-1 uppercase ${
                                        isCaptured ? "text-emerald-300" : "text-zinc-500"
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
                              <h3 className="text-[15px] font-bold text-white leading-snug line-clamp-2" title={tx.item_name}>
                                {tx.item_name}
                              </h3>
                              <p className={`text-xs truncate ${isCaptured ? "text-emerald-200/80" : "text-zinc-400"}`}>
                                {tx.merchant_name || "Commercial Vendor"}
                              </p>
                              <p
                                className={`text-[10px] font-mono truncate ${
                                  isCaptured
                                    ? "text-emerald-400/80"
                                    : isBlocked
                                    ? "text-rose-300/85"
                                    : "text-zinc-500"
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
                                <span className="text-zinc-500 shrink-0">Policy Gate</span>
                                <span className="font-mono text-rose-300 font-semibold truncate">
                                  HTTP 403 Pre-Purchase Intercept
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-zinc-500 shrink-0">PayPal Escrow</span>
                                <span className="font-mono text-zinc-300 truncate">
                                  Not Created ($0 Reserved)
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-zinc-500 shrink-0">Cart / Shipping</span>
                                <span className="font-mono text-zinc-400 truncate">
                                  Halted Before Checkout
                                  {tx.created_at ? ` • ${String(tx.created_at).slice(11, 16)}` : ""}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-rose-500/20">
                                <span className="text-zinc-500 shrink-0">Vision POD Audit</span>
                                <span className="font-mono text-rose-400 font-semibold truncate">
                                  Skipped — Blocked Before Delivery
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className={`border rounded-2xl p-3 space-y-1.5 text-[11px] ${telemetryBoxClass}`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className={isCaptured ? "text-emerald-300/70 shrink-0" : "text-zinc-500 shrink-0"}>
                                  PayPal Order
                                </span>
                                <span className="font-mono text-zinc-200 truncate">{tx.paypal_order_id || "—"}</span>
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <span className={isCaptured ? "text-emerald-300/70 shrink-0" : "text-zinc-500 shrink-0"}>
                                  {tx.paypal_capture_id
                                    ? "Capture ID"
                                    : tx.paypal_dispute_id
                                    ? "Dispute ID"
                                    : "Auth ID"}
                                </span>
                                <span
                                  className={`font-mono truncate ${
                                    tx.paypal_capture_id
                                      ? "text-[#1ed760] font-semibold"
                                      : tx.paypal_dispute_id
                                      ? "text-rose-300"
                                      : "text-sky-300"
                                  }`}
                                >
                                  {tx.paypal_capture_id || tx.paypal_dispute_id || tx.paypal_auth_id || "Awaiting Auth"}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <span className={isCaptured ? "text-emerald-300/70 shrink-0" : "text-zinc-500 shrink-0"}>
                                  Tracking
                                </span>
                                <span className="font-mono text-zinc-300 truncate">
                                  {tx.tracking_number || "Pending"}
                                  {tx.created_at ? ` • ${String(tx.created_at).slice(11, 16)}` : ""}
                                </span>
                              </div>

                              <div
                                className={`flex items-center justify-between gap-2 pt-1 border-t ${
                                  isCaptured ? "border-[#1ed760]/20" : "border-zinc-800/70"
                                }`}
                              >
                                <span className={isCaptured ? "text-emerald-300/70 shrink-0" : "text-zinc-500 shrink-0"}>
                                  Vision Audit
                                </span>
                                {hasRealVisionVerdict ? (
                                  <span
                                    className={`font-mono font-semibold truncate ${
                                      savedVisionAnalysis.recommended_action === "CAPTURE_ESCROW" ||
                                      savedVisionAnalysis.verdict === "VERIFIED_INTACT"
                                        ? "text-[#1ed760]"
                                        : "text-rose-400"
                                    }`}
                                  >
                                    {savedVisionAnalysis.verdict} (
                                    {(Number(savedVisionAnalysis.integrity_score || 0) * 100).toFixed(0)}%)
                                  </span>
                                ) : hasCapturedPhoto ? (
                                  <span className="font-mono text-sky-300 truncate">Photo ready &rarr; Inspect</span>
                                ) : (
                                  <span className={`font-mono truncate ${isCaptured ? "text-emerald-400/70" : "text-zinc-500"}`}>
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
                                  <span className={isCaptured ? "text-emerald-300/70 shrink-0" : "text-zinc-500 shrink-0"}>
                                    Saved Proof
                                  </span>
                                  <span className="font-mono text-zinc-300 truncate">
                                    {savedVisionAnalysis?.detected_item
                                      ? savedVisionAnalysis.detected_item
                                      : `SHA ${String(tx.photo_evidence_hash).slice(0, 12)}...`}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {(isBlocked || tx.block_reason) && (
                            <div className="text-[11px] bg-rose-950/35 border border-rose-500/25 rounded-xl px-3 py-2 space-y-1">
                              <p className="text-rose-200 font-semibold leading-snug">
                                {tx.block_reason || tx.maker_checker_audit?.reason || "Blocked by OpenGuardrails & Spending Mandate."}
                              </p>
                              {isBlocked && (
                                <p className="text-[10px] text-rose-300/80 leading-snug">
                                  Stopped before PayPal order creation — excluded from escrow queue, shipping, and delivery photo audit.
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Bottom Flexible Cart / Escrow Action Controls — ONLY Needed Options Per State */}
                        <div
                          className={`pt-3 border-t flex flex-wrap items-center justify-between gap-1.5 ${
                            isCaptured ? "border-[#1ed760]/25" : isBlocked ? "border-rose-500/20" : "border-zinc-800/80"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isBlocked && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-rose-300/90 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                <ShieldAlert className="w-3 h-3 text-rose-400" />
                                <span>0 PayPal Calls</span>
                              </span>
                            )}

                            {isPendingApproval && tx.approval_url && (
                              <a
                                href={tx.approval_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold inline-flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Approve</span>
                              </a>
                            )}

                            {isPendingApproval && tx.paypal_order_id && (
                              <button
                                onClick={() => handleAuthorizeOrder(tx.paypal_order_id)}
                                disabled={loading}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-black text-[11px] font-bold inline-flex items-center gap-1"
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
                                    ? "bg-zinc-900/50 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-55 pointer-events-none"
                                    : hasCapturedPhoto
                                    ? "bg-emerald-950/45 hover:bg-emerald-950/70 border-emerald-500/40 text-emerald-300 cursor-pointer"
                                    : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200 cursor-pointer"
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
                                className="px-2.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-black text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
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
                            {isAuthorized && (
                              <button
                                onClick={() => handleCaptureFunds(tx.id)}
                                disabled={loading}
                                className="px-3 py-1.5 rounded-xl bg-[#1ed760] hover:bg-emerald-300 disabled:opacity-60 text-black text-[11px] font-extrabold inline-flex items-center gap-1 shadow-[0_0_14px_rgba(30,215,96,0.25)]"
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
                                    ? "bg-[#092114] hover:bg-rose-950/70 border-[#1ed760]/30 hover:border-rose-500/40 text-emerald-200 hover:text-rose-200"
                                    : "bg-zinc-900 hover:bg-rose-950/70 border-zinc-800 hover:border-rose-500/40 text-rose-300"
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
                                    ? "bg-[#0b2a19] hover:bg-[#113d25] border-[#1ed760]/40 text-emerald-200"
                                    : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-sky-300"
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
                                  ? "bg-[#1ed760]/15 hover:bg-[#1ed760]/25 border-[#1ed760]/50 text-[#1ed760]"
                                  : isBlocked
                                  ? "bg-rose-950/50 hover:bg-rose-900/60 border-rose-500/40 text-rose-200"
                                  : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200"
                              }`}
                              title={isBlocked ? "Inspect pre-purchase policy rejection details" : "View Full SHA-256 Chain & Audit"}
                            >
                              {isBlocked ? (
                                <ShieldAlert className="w-3 h-3 text-rose-400" />
                              ) : (
                                <Shield className="w-3 h-3 text-[#1ed760]" />
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
          const activePipelineStep = isInspecting
            ? Math.max(1, visionPipelineStep)
            : hasResult || isAlreadySettled
            ? 4
            : 0;

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* LEFT DIV: PROOF OF DELIVERY (POD) IMAGE CAPTURE */}
              <div className="w-full h-full bg-[#18191e] hover:border-zinc-700/90 rounded-[28px] p-4 border border-[#2a2c34] shadow-[0_20px_50px_rgba(0,0,0,0.55)] flex flex-col transition-colors">
                <div className="flex items-center justify-between gap-2 px-1.5 mb-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                      <VisionLensLogo className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-white tracking-tight truncate">
                        Proof of Delivery (POD)
                      </h2>
                      <p className="text-[11px] text-zinc-400 truncate">
                        AI Validation &amp; Hash Verification
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#1ed760]/15 border border-[#1ed760]/30 text-[10px] font-mono font-bold text-[#1ed760] shrink-0">
                    Vision POD
                  </span>
                </div>

                <div className="bg-[#0a0b0e] rounded-3xl p-4 sm:p-5 shadow-inner border border-white/[0.06] flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label className="text-[11px] font-medium text-zinc-400">
                          Target Escrow Order
                        </label>
                        <span
                          className={`text-[10px] font-mono ${
                            photoTxId ? "text-[#1ed760]" : "text-zinc-500"
                          }`}
                        >
                          {photoTxId ? `Bound: ${photoTxId}` : "Manual Inspection (Sandbox Mode)"}
                        </span>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                          className="w-full bg-[#121318] border border-zinc-800 focus:border-[#1ed760] rounded-xl pl-8 pr-8 py-2.5 text-xs text-white font-mono placeholder-zinc-500 outline-none transition-colors"
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
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-0.5 rounded"
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
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-2xl bg-[#121318] border border-zinc-700/90 shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setPhotoTxId("");
                                  setPhotoTxQuery("");
                                  setTxSuggestionsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-[11px] font-mono border-b border-zinc-800/80 flex items-center justify-between hover:bg-zinc-900 ${
                                  !photoTxId ? "bg-zinc-900/80 text-white font-semibold" : "text-zinc-300"
                                }`}
                              >
                                <span>Manual Inspection (Sandbox Mode)</span>
                                <span className="text-[10px] text-zinc-500">Unbound</span>
                              </button>

                              {matches.length === 0 ? (
                                <div className="px-3 py-2.5 text-[11px] text-zinc-500 font-mono">
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
                                    className={`w-full text-left px-3 py-2 border-b border-zinc-800/50 last:border-b-0 hover:bg-zinc-900 flex items-center justify-between gap-2 ${
                                      photoTxId === t.id ? "bg-[#1ed760]/10" : ""
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 text-[11px] font-mono">
                                        <span className="font-bold text-[#1ed760]">{t.id}</span>
                                        <span className="text-zinc-500 truncate">
                                          {t.paypal_order_id ? `PP:${t.paypal_order_id}` : t.tracking_number || ""}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-zinc-200 truncate">{t.item_name}</p>
                                    </div>
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 shrink-0">
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
                            <div className="mt-2 rounded-xl bg-[#121318] border border-zinc-800/80 px-3 py-2 text-[10px] font-mono space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-zinc-400">
                                  Order: <strong className="text-[#1ed760]">{boundTx.id}</strong>
                                </span>
                                <span className="text-zinc-500 truncate">
                                  Track: {boundTx.tracking_number || "Pending"}
                                </span>
                              </div>
                              <div className="text-zinc-300 truncate">
                                Item: <span className="text-white font-semibold">{boundTx.item_name}</span>
                              </div>
                            </div>
                          );
                        }
                        if (photoTxQuery.trim()) {
                          return (
                            <p className="mt-1.5 text-[10px] font-mono text-amber-300">
                              Select a matching order above or enter the full TX ID to bind escrow.
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <label className="group relative flex flex-col items-center justify-center gap-2.5 border border-dashed border-zinc-700/80 hover:border-[#1ed760]/70 rounded-2xl bg-[#111217] h-44 cursor-pointer overflow-hidden transition-all p-3">
                      <div className="pointer-events-none absolute -top-10 h-24 w-44 rounded-full bg-[#1ed760]/5 blur-2xl group-hover:bg-[#1ed760]/15 transition-colors" />
                      {photoPreviewUrl ? (
                        <img
                          src={photoPreviewUrl}
                          alt="Uploaded parcel proof"
                          className="relative z-10 w-full h-full object-contain rounded-xl"
                        />
                      ) : (
                        <>
                          <div className="relative z-10 w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 group-hover:border-[#1ed760]/50 flex items-center justify-center transition-colors shadow-inner">
                            <Upload className="w-4 h-4 text-zinc-400 group-hover:text-[#1ed760]" />
                          </div>
                          <span className="relative z-10 text-xs font-semibold text-zinc-200">
                            Select delivery photo
                          </span>
                          <span className="relative z-10 text-[10px] font-mono text-zinc-500">
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

                  <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 text-[11px] text-zinc-400 truncate">
                      {isAlreadySettled ? (
                        <span className={`font-mono font-semibold inline-flex items-center gap-1.5 ${
                          isSettledProtected || boundTx?.status === "VOIDED" || boundTx?.status === "DISPUTED"
                            ? "text-rose-300"
                            : "text-[#1ed760]"
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {isSettledProtected || boundTx?.status === "VOIDED" || boundTx?.status === "DISPUTED"
                              ? "Escrow Protected • Hold Voided"
                              : "Verified & Paid • Settled on PayPal"}
                          </span>
                        </span>
                      ) : selectedPhotoFile ? (
                        <span className="font-mono text-zinc-300">
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
                            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-[11px] font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          >
                            Next Order
                          </button>
                          {boundTx && (
                            <button
                              type="button"
                              onClick={() => openTxInspector(boundTx, "vision")}
                              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-semibold text-sky-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
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
                            className="px-4 py-2 rounded-full bg-[#1ed760] hover:bg-emerald-300 text-black text-xs font-extrabold inline-flex items-center gap-1.5 shadow-[0_0_20px_rgba(30,215,96,0.28)] transition-all cursor-pointer"
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
                              className="px-2.5 py-1.5 rounded-xl bg-transparent hover:bg-zinc-900/70 border border-zinc-800/80 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                              Clear
                            </button>
                          )}
                          <button
                            onClick={() => handleInspectRealPhoto()}
                            disabled={loading || !selectedPhotoFile}
                            className="px-4 py-2 rounded-full bg-[#1ed760] hover:bg-emerald-300 disabled:opacity-45 text-black text-xs font-extrabold inline-flex items-center gap-1.5 shadow-[0_0_20px_rgba(30,215,96,0.28)] transition-all cursor-pointer"
                          >
                            {isInspecting ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Calling APIs...</span>
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
              <div className="w-full h-full bg-[#18191e] hover:border-zinc-700/90 rounded-[28px] p-4 border border-[#2a2c34] shadow-[0_20px_50px_rgba(0,0,0,0.55)] flex flex-col transition-colors">
                <div className="flex items-center justify-between gap-2 px-1.5 mb-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                      <AuroraShieldLogo className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-white tracking-tight truncate">
                        Audit Trail &amp; Escrow
                      </h2>
                      <p className="text-[11px] text-zinc-400 truncate">
                        Real-time cryptographic and visual verification
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-mono font-black tracking-tight shrink-0 ${
                      isInspecting
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                        : chainPassed
                        ? "bg-[#1ed760] text-black shadow-[0_0_16px_rgba(30,215,96,0.35)]"
                        : chainFailed
                        ? "bg-rose-500 text-white shadow-[0_0_16px_rgba(244,63,94,0.35)]"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                    }`}
                  >
                    {ins?.model ? ins.model : isInspecting ? "SCANNING" : chainPassed ? "VERIFIED" : chainFailed ? "FLAGGED" : "STANDBY"}
                  </span>
                </div>

                <div className="bg-[#0a0b0e] rounded-3xl p-4 sm:p-5 shadow-inner border border-white/[0.06] flex-1 flex flex-col justify-between gap-4">
                  {/* LIVE MULTI-API CALL PIPELINE BAR */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { step: 1, label: "SHA-256 Hash", sub: "Evidence" },
                      { step: 2, label: "Gemini Vision", sub: "POD Scan" },
                      { step: 3, label: "Ledger Chain", sub: "Guardrails" },
                      { step: 4, label: "PayPal API", sub: chainFailed ? "Void" : "Capture" },
                    ].map((s) => {
                      const isDone = activePipelineStep === 4 || (activePipelineStep > s.step && isInspecting);
                      const isActive = isInspecting && activePipelineStep === s.step;
                      return (
                        <div
                          key={s.step}
                          className={`rounded-xl border px-2.5 py-2 transition-all ${
                            isActive
                              ? "bg-sky-500/15 border-sky-400/60 shadow-[0_0_16px_rgba(56,189,248,0.2)]"
                              : isDone
                              ? chainFailed && s.step === 4
                                ? "bg-rose-500/10 border-rose-500/40"
                                : "bg-[#0d2217] border-[#1ed760]/40"
                              : "bg-[#121318] border-zinc-800/70 opacity-65"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[9px] font-mono text-zinc-500">0{s.step}</span>
                            {isActive ? (
                              <Loader2 className="w-3 h-3 text-sky-400 animate-spin" />
                            ) : isDone ? (
                              <CheckCircle2
                                className={`w-3 h-3 ${
                                  chainFailed && s.step === 4 ? "text-rose-400" : "text-[#1ed760]"
                                }`}
                              />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                            )}
                          </div>
                          <p
                            className={`text-[10px] font-bold truncate ${
                              isActive ? "text-sky-200" : isDone ? "text-white" : "text-zinc-400"
                            }`}
                          >
                            {s.label}
                          </p>
                          <p className="text-[9px] font-mono text-zinc-500 truncate">{s.sub}</p>
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
                          ? "bg-sky-950/30 border-sky-500/40"
                          : chainPassed
                          ? "bg-emerald-950/35 border-emerald-500/50"
                          : chainFailed
                          ? "bg-rose-950/35 border-rose-500/50"
                          : "bg-[#121318] border-zinc-800/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                          Cryptographic Ledger Check
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            isInspecting
                              ? "bg-sky-500/20 text-sky-300"
                              : chainPassed
                              ? "bg-[#1ed760]/20 text-[#1ed760]"
                              : chainFailed
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {isInspecting ? "CHECKING" : chainPassed ? "PASS • GREEN" : chainFailed ? "FAIL • RED" : "IDLE"}
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        {isInspecting ? (
                          <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0 mt-0.5" />
                        ) : chainPassed ? (
                          <CheckCircle2 className="w-4 h-4 text-[#1ed760] shrink-0 mt-0.5" />
                        ) : chainFailed ? (
                          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        ) : (
                          <Lock className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 space-y-0.5">
                          <p
                            className={`text-xs font-semibold truncate ${
                              chainPassed ? "text-emerald-200" : chainFailed ? "text-rose-200" : "text-zinc-200"
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
                          <p className="text-[11px] font-mono text-zinc-400 truncate">
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
                          ? "bg-sky-950/30 border-sky-500/40"
                          : chainPassed
                          ? "bg-emerald-950/35 border-emerald-500/50"
                          : chainFailed
                          ? "bg-rose-950/35 border-rose-500/50"
                          : "bg-[#121318] border-zinc-800/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                          Escrow Settlement Status
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            isInspecting
                              ? "bg-sky-500/20 text-sky-300"
                              : chainPassed
                              ? "bg-[#1ed760]/20 text-[#1ed760]"
                              : chainFailed
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {isInspecting
                            ? "PENDING"
                            : isSettledCaptured
                            ? "CAPTURED"
                            : isSettledProtected
                            ? visionResult.status
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
                              chainPassed ? "text-emerald-200" : chainFailed ? "text-rose-200" : "text-zinc-200"
                            }`}
                          >
                            {isInspecting
                              ? "Evaluating settlement path..."
                              : isSettledCaptured
                              ? "Escrow Released to Seller"
                              : isSettledProtected
                              ? "Buyer Protected (Hold Cancelled)"
                              : chainPassed
                              ? "Eligible for PayPal Capture"
                              : chainFailed
                              ? "Escrow Frozen • Auto-Protect"
                              : "Release on Pass / Protect on Fail"}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate">
                            {isSettledCaptured
                              ? `Capture ID: ${visionResult.paypal_capture_id || "Confirmed"}`
                              : visionResult?.auto_settle_error
                              ? visionResult.auto_settle_error
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
                            className="px-2.5 py-1.5 rounded-xl bg-[#1ed760] hover:bg-emerald-300 text-black text-[11px] font-bold shrink-0"
                          >
                            Capture
                          </button>
                        )}
                        {chainFailed && photoTxId && !isSettledProtected && (
                          <button
                            type="button"
                            onClick={() => handleVoidOrDispute(photoTxId)}
                            disabled={loading}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-[11px] font-bold shrink-0"
                          >
                            Void Hold
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* FORENSIC METRICS GRID + OBSERVATIONS OR EMPTY STATE */}
                  {hasResult ? (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="bg-[#121318] border border-zinc-800/80 rounded-2xl p-3">
                          <span className="text-[10px] text-zinc-400 block">Integrity</span>
                          <span className={`text-base font-bold ${chainPassed ? "text-[#1ed760]" : "text-rose-400"}`}>
                            {(Number(analysis.integrity_score || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="bg-[#121318] border border-zinc-800/80 rounded-2xl p-3">
                          <span className="text-[10px] text-zinc-400 block">Deformation</span>
                          <span className="text-base font-bold text-white">
                            {(Number(analysis.deformation_score || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="bg-[#121318] border border-zinc-800/80 rounded-2xl p-3">
                          <span className="text-[10px] text-zinc-400 block">Condition</span>
                          <span className="text-xs font-mono font-semibold text-zinc-200 truncate block mt-1" title={analysis.condition}>
                            {analysis.condition}
                          </span>
                        </div>
                      </div>

                      {Array.isArray(analysis.vision_reasoning) && (
                        <div className="bg-[#121318] border border-zinc-800/80 rounded-2xl p-3.5 space-y-1">
                          <span className="text-[11px] text-zinc-400 font-medium block">Gemini Forensic Observations</span>
                          <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-zinc-200">
                            {analysis.vision_reasoning.map((r: string, i: number) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800/90 bg-[#121318]/70 px-5 py-7 text-center">
                      <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-2.5">
                        <GeminiLogo className="w-4 h-4" />
                      </div>
                      <p className="text-xs text-zinc-200 font-semibold tracking-tight">Awaiting visual input...</p>
                      <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">
                        Select a Target Escrow Order and drop a parcel photo on the left to trigger cryptographic + Gemini Vision verification.
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
            <div className="md:col-span-6 bg-[#111114] border border-zinc-800/90 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Corporate Spending Mandate &amp; Wallet</h2>
                  <p className="text-xs text-zinc-400">Deterministic rules enforced before PayPal order creation</p>
                </div>
                <button
                  onClick={() => setIsSetAmountModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white"
                >
                  Edit Pool &amp; Cap
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5">
                  <span className="text-zinc-400 block">Escrow Pool Balance</span>
                  <span className="text-lg font-bold text-white mt-0.5 block">{formatMoney(mandate.remaining_pool)}</span>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5">
                  <span className="text-zinc-400 block">Max Single Spend</span>
                  <span className="text-lg font-bold text-white mt-0.5 block">{formatMoney(mandate.max_single_spend)}</span>
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Allowed Categories</span>
                  <span className="font-mono text-white">{mandate.allowed_categories}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Circuit Breaker</span>
                  <span className={killSwitchStatus.is_locked_down ? "text-rose-400 font-bold" : "text-emerald-400 font-medium"}>
                    {killSwitchStatus.is_locked_down ? "LOCKED DOWN" : "ARMED & HEALTHY"}
                  </span>
                </div>
              </div>
            </div>

            <div className="md:col-span-6 bg-[#111114] border border-zinc-800/90 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Dual-Agent Maker-Checker &amp; PayPal Profile</h2>
                  <p className="text-xs text-zinc-400">Air-gapped auditor signing and delegated PayPal buyer account</p>
                </div>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-sky-300 inline-flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>PayPal Profile</span>
                </button>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Connected Buyer</span>
                  <span className="font-mono text-white">{connectedAccount?.email || "Not Linked"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Payer ID</span>
                  <span className="font-mono text-zinc-300">{connectedAccount?.payer_id || "—"}</span>
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
                className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black text-xs font-semibold flex items-center justify-center gap-2"
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
                <div className="bg-zinc-950 border border-emerald-500/30 rounded-lg p-3 text-xs font-mono text-emerald-300 space-y-1">
                  <div>Status: {makerCheckerRes.status}</div>
                  {makerCheckerRes.audit?.cryptographic_signature && (
                    <div className="truncate text-zinc-400">HMAC: {makerCheckerRes.audit.cryptographic_signature}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* CHECKOUT CONFIRMATION MODAL */}
      {checkoutProduct && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 overscroll-contain">
          <div className="bg-[#111114] border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Confirm PayPal Smart Escrow</h3>
                <p className="text-xs text-zinc-400 mt-0.5">{checkoutProduct.merchant}</p>
              </div>
              <button onClick={() => setCheckoutProduct(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2 text-xs">
              <div className="font-semibold text-sm text-white">{checkoutProduct.name}</div>
              <div className="text-zinc-400">{checkoutProduct.description}</div>
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">Escrow Hold Amount</span>
                <span className="text-base font-bold text-white">{formatMoney(checkoutProduct.amount)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCheckoutProduct(null)}
                className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBuyItem(checkoutProduct)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-xs font-semibold text-black flex items-center justify-center gap-1.5"
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
          className={`fixed bottom-5 right-5 z-[60] max-w-sm w-full rounded-xl border px-4 py-3 shadow-2xl backdrop-blur flex items-start justify-between gap-3 text-xs transition-all ${
            notice.status === "SUCCESS" || notice.status === "CAPTURED"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-100"
              : notice.status === "BLOCKED" || notice.status === "ERROR" || notice.status === "DISPUTED"
              ? "bg-rose-950/90 border-rose-500/50 text-rose-100"
              : notice.status === "LOADING"
              ? "bg-[#111114]/95 border-sky-500/50 text-sky-100"
              : "bg-[#111114]/95 border-zinc-700 text-zinc-100"
          }`}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            {notice.status === "LOADING" ? (
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0 mt-0.5" />
            ) : notice.status === "SUCCESS" || notice.status === "CAPTURED" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5 min-w-0">
              <p className="font-semibold text-xs truncate">{notice.title || notice.status}</p>
              <p className="text-[11px] text-zinc-300 leading-relaxed line-clamp-3">{notice.message}</p>
            </div>
          </div>
          <button onClick={() => setNotice(null)} className="text-zinc-400 hover:text-white p-0.5 shrink-0">
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
