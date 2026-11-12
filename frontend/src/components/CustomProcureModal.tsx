"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  ShoppingBag,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  Sparkles,
  Loader2,
  CheckCircle2,
  BookmarkPlus,
  BookmarkCheck,
  Trash2,
} from "lucide-react";

interface SavedPreset {
  id: string;
  label: string;
  name: string;
  amount: string;
  currency: "USD" | "INR";
  category: string;
  merchant: string;
  description: string;
}

const PRESETS_STORAGE_KEY = "aurorapay_custom_order_presets";
const DRAFT_STORAGE_KEY = "aurorapay_custom_order_draft";

interface CustomProcureModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: "USD" | "INR";
  maxSingleSpendInr: number;
  remainingBudgetInr: number;
  onProcure: (customProduct: {
    name: string;
    category: string;
    amount: number;
    merchant: string;
    description: string;
  }) => Promise<any>;
  loading: boolean;
}

const PROHIBITED_KEYWORDS = [
  "rolex",
  "gucci",
  "louis vuitton",
  "weapon",
  "firearm",
  "casino",
  "gambling",
  "jewelry",
  "gold bar",
  "crypto",
  "gift card",
];

const QUICK_TEMPLATES = [
  {
    label: "MacBook Pro Dock",
    name: "CalDigit TS4 Thunderbolt 4 Dock",
    usd: "299",
    inr: "25415",
    category: "electronics",
    merchant: "Apple Store Commercial",
    description: "Engineering workstation hub",
    tone: "safe",
  },
  {
    label: "AWS Cloud GPU",
    name: "AWS EC2 G5 GPU Compute Credits",
    usd: "180",
    inr: "15300",
    category: "cloud",
    merchant: "Amazon Web Services India",
    description: "AI vision inference workload quota",
    tone: "safe",
  },
  {
    label: "Luxury Test (Block)",
    name: "Rolex Submariner Oystersteel",
    usd: "1150",
    inr: "97750",
    category: "luxury",
    merchant: "Swiss Chrono Vault",
    description: "Policy block compliance verification",
    tone: "block",
  },
];

export const CustomProcureModal: React.FC<CustomProcureModalProps> = ({
  isOpen,
  onClose,
  currency,
  maxSingleSpendInr,
  remainingBudgetInr,
  onProcure,
  loading,
}) => {
  const RATE = 85.0;

  const [name, setName] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("electronics");
  const [amountInput, setAmountInput] = useState("");
  const [description, setDescription] = useState("");
  const [activePresetLabel, setActivePresetLabel] = useState<string | null>(null);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [justSavedPreset, setJustSavedPreset] = useState(false);

  // Restore saved 1-click presets & draft from localStorage cleanly
  useEffect(() => {
    try {
      const rawPresets = window.localStorage.getItem(PRESETS_STORAGE_KEY);
      if (rawPresets) {
        const parsed = JSON.parse(rawPresets);
        if (Array.isArray(parsed)) setSavedPresets(parsed);
      }
      const rawDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft && typeof draft === "object") {
          if (draft.name) setName(String(draft.name));
          if (draft.merchant) setMerchant(String(draft.merchant));
          if (draft.category) setCategory(String(draft.category));
          if (draft.amountInput) setAmountInput(String(draft.amountInput));
          if (draft.description) setDescription(String(draft.description));
        }
      }
    } catch {
      // Ignore storage availability errors
    }
  }, []);

  // Debounce draft persistence so typing stays 60fps without per-keystroke localStorage writes
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ name, merchant, category, amountInput, description })
        );
      } catch {
        // Ignore storage availability errors
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [name, merchant, category, amountInput, description]);

  const handleOneClickSavePreset = () => {
    const cleanName = name.trim() || "Saved Custom Order";
    const cleanAmount = amountInput.trim() || (currency === "USD" ? "150" : "12500");
    const shortLabel = cleanName.length > 22 ? `${cleanName.slice(0, 20)}...` : cleanName;
    const newPreset: SavedPreset = {
      id: `preset-${Date.now()}`,
      label: shortLabel,
      name: cleanName,
      amount: cleanAmount,
      currency,
      category,
      merchant: merchant.trim() || "Commercial Merchant Direct",
      description: description.trim() || "Saved custom escrow preset",
    };
    const next = [newPreset, ...savedPresets.filter((p) => p.name.toLowerCase() !== cleanName.toLowerCase())].slice(0, 6);
    setSavedPresets(next);
    setActivePresetLabel(newPreset.label);
    setJustSavedPreset(true);
    setTimeout(() => setJustSavedPreset(false), 1800);
    try {
      window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage availability errors
    }
  };

  const handleDeleteSavedPreset = (id: string) => {
    const next = savedPresets.filter((p) => p.id !== id);
    setSavedPresets(next);
    try {
      window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage availability errors
    }
  };

  const applySavedPreset = (preset: SavedPreset) => {
    setName(preset.name);
    const val = parseFloat(preset.amount) || 0;
    const convertedVal =
      preset.currency === currency
        ? preset.amount
        : currency === "USD"
        ? (val / RATE).toFixed(2)
        : String(Math.round(val * RATE));
    setAmountInput(convertedVal);
    setCategory(preset.category);
    setMerchant(preset.merchant);
    setDescription(preset.description);
    setActivePresetLabel(preset.label);
  };

  const enteredAmount = parseFloat(amountInput) || 0;
  const amountInInr = currency === "USD" ? enteredAmount * RATE : enteredAmount;
  const convertedSecondary =
    currency === "USD"
      ? `≈ ₹${Math.round(amountInInr).toLocaleString("en-IN")}`
      : `≈ $${(amountInInr / RATE).toFixed(2)} USD`;

  const currentCap = currency === "USD" ? maxSingleSpendInr / RATE : maxSingleSpendInr;
  const currentBudget = currency === "USD" ? remainingBudgetInr / RATE : remainingBudgetInr;
  const remainingAfter = Math.max(0, currentBudget - enteredAmount);

  // Real-time live OpenGuardrails prediction so the user sees pass/block rules before clicking
  const guardrailPreview = useMemo(() => {
    const lowerText = `${name} ${merchant} ${description}`.toLowerCase();
    const matchedKeyword = PROHIBITED_KEYWORDS.find((kw) => lowerText.includes(kw));

    if (category === "luxury") {
      return {
        willPass: false,
        title: "Blocked by Category Mandate (HTTP 403)",
        detail: "Category 'luxury' is prohibited by corporate OpenGuardrails policy.",
      };
    }
    if (matchedKeyword) {
      return {
        willPass: false,
        title: `Prohibited Keyword Detected: "${matchedKeyword}"`,
        detail: "OpenGuardrails flags this item automatically before touching PayPal.",
      };
    }
    if (enteredAmount > 0 && amountInInr > maxSingleSpendInr) {
      return {
        willPass: false,
        title: "Exceeds Single-Order Spending Cap",
        detail: `Requested ${
          currency === "USD" ? `$${enteredAmount.toFixed(2)}` : `₹${enteredAmount.toLocaleString("en-IN")}`
        } exceeds cap of ${
          currency === "USD" ? `$${currentCap.toFixed(2)}` : `₹${currentCap.toLocaleString("en-IN")}`
        }.`,
      };
    }
    if (enteredAmount > 0 && amountInInr > remainingBudgetInr) {
      return {
        willPass: false,
        title: "Insufficient Escrow Pool Balance",
        detail: "Requested hold exceeds available corporate pool funds.",
      };
    }
    if (enteredAmount <= 0 || !name.trim()) {
      return {
        willPass: true,
        pendingInput: true,
        title: "Ready for Guardrail Evaluation",
        detail: "Enter an item & price (or click a quick preset above) to preview live policy checks.",
      };
    }
    return {
      willPass: true,
      pendingInput: false,
      title: "OpenGuardrails Pre-Flight: PASS",
      detail: `Eligible for PayPal AUTHORIZE escrow. Pool remaining after hold: ${
        currency === "USD"
          ? `$${remainingAfter.toFixed(2)}`
          : `₹${Math.round(remainingAfter).toLocaleString("en-IN")}`
      }.`,
    };
  }, [name, merchant, description, category, enteredAmount, amountInInr, maxSingleSpendInr, remainingBudgetInr, currency, currentCap, remainingAfter]);

  if (!isOpen) return null;

  const applyTemplate = (tpl: (typeof QUICK_TEMPLATES)[number]) => {
    setName(tpl.name);
    setAmountInput(currency === "USD" ? tpl.usd : tpl.inr);
    setCategory(tpl.category);
    setMerchant(tpl.merchant);
    setDescription(tpl.description);
    setActivePresetLabel(tpl.label);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    await onProcure({
      name: name || "Custom Requested Asset",
      category,
      amount: amountInInr,
      merchant: merchant || "Commercial Merchant Direct",
      description: description || "Autonomous AI procurement request",
    });
  };

  const quickAmounts = currency === "USD" ? ["100", "250", "500"] : ["5000", "15000", "25000"];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-slate-900/35 backdrop-blur-sm overscroll-contain"
      onClick={onClose}
    >
      <div
        className="relative surface-card bg-white border border-[#ece8f8] rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-900 font-sans shadow-2xl shadow-violet-950/15"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Lilac Top Glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at 88% -8%, rgba(124,58,237,0.08), transparent 46%)" }}
        />

        {/* Pinned Header */}
        <div className="relative shrink-0 flex items-center justify-between gap-3 border-b border-[#ece8f8] px-6 py-4 bg-[#f8f7fc]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#f3efff] border border-[#ddd2fe] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4 text-[#7c3aed]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                  Create PayPal Escrow Order
                </h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-white border border-[#ebe6fa] text-[10px] font-mono font-semibold text-[#6d28d9]">
                  v2 Hold
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Live OpenGuardrails evaluation &rarr; instant escrow reservation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white hover:bg-violet-50 border border-[#ebe6fa] rounded-xl text-slate-500 hover:text-slate-900 transition-colors shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="custom-procure-form" onSubmit={handleSubmit} className="relative flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-4 text-xs">
          {/* Limit Strip + One-Click Presets */}
          <div className="rounded-2xl bg-[#f8f7fc] border border-[#ebe6fa] p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">
                <Sparkles className="w-3.5 h-3.5 text-[#7c3aed]" />
                Quick &amp; Saved Presets
              </span>
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded-md bg-white border border-[#ebe6fa] text-slate-700 font-semibold">
                  Cap {currency === "USD" ? `$${currentCap.toFixed(0)}` : `₹${Math.round(currentCap).toLocaleString("en-IN")}`}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#f3efff] border border-[#ddd2fe] text-[#6d28d9] font-semibold">
                  Pool {currency === "USD" ? `$${currentBudget.toFixed(0)}` : `₹${Math.round(currentBudget).toLocaleString("en-IN")}`}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_TEMPLATES.map((tpl) => {
                const isActive = activePresetLabel === tpl.label;
                return (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                      tpl.tone === "block"
                        ? isActive
                          ? "bg-rose-100 border-rose-400 text-rose-800"
                          : "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700"
                        : isActive
                        ? "bg-[#f3efff] border-[#8b5cf6] text-[#6d28d9]"
                        : "bg-white hover:bg-violet-50/70 border-[#e5e0f4] text-slate-700"
                    }`}
                  >
                    {tpl.label}
                  </button>
                );
              })}

              {savedPresets.map((preset) => {
                const isActive = activePresetLabel === preset.label;
                return (
                  <div
                    key={preset.id}
                    className={`inline-flex items-center rounded-xl border transition-all ${
                      isActive
                        ? "bg-[#f3efff] border-[#8b5cf6] text-[#6d28d9]"
                        : "bg-sky-50 hover:bg-sky-100/80 border-sky-200 text-sky-700"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => applySavedPreset(preset)}
                      className="pl-2.5 pr-1.5 py-1.5 text-[11px] font-semibold cursor-pointer"
                      title={`Load saved preset: ${preset.name}`}
                    >
                      {preset.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedPreset(preset.id)}
                      className="pr-2 pl-0.5 py-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Remove saved preset"
                      aria-label={`Delete preset ${preset.label}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 mb-1.5">
              Item / Asset Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apple MacBook Pro Dock, NVIDIA H100 Cloud..."
              value={name}
              onChange={(e) => {
                setActivePresetLabel(null);
                setName(e.target.value);
              }}
              className="w-full bg-[#faf9ff] border border-[#e3ddf3] hover:border-[#c8bce8] focus:bg-white focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/15 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs placeholder:text-slate-400 outline-none transition-all"
            />
          </div>

          {/* Price + Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  Price ({currency})
                </label>
                <div className="flex items-center gap-1">
                  {enteredAmount > 0 ? (
                    <span className="text-[10px] font-mono font-semibold text-[#6d28d9]">{convertedSecondary}</span>
                  ) : (
                    quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmountInput(amt)}
                        className="px-1.5 py-0.5 rounded-md bg-[#f8f7fc] hover:bg-violet-50 border border-[#ebe6fa] text-[10px] font-mono font-medium text-slate-600 transition-colors cursor-pointer"
                      >
                        {currency === "USD" ? `$${amt}` : `₹${Number(amt).toLocaleString("en-IN")}`}
                      </button>
                    ))
                  )}
                </div>
              </div>
              <div className="flex items-center bg-[#faf9ff] border border-[#e3ddf3] hover:border-[#c8bce8] focus-within:bg-white focus-within:border-[#7c3aed] focus-within:ring-2 focus-within:ring-[#7c3aed]/15 rounded-xl px-3.5 py-2.5 transition-all">
                <span className="text-slate-500 font-mono font-bold mr-2">
                  {currency === "USD" ? "$" : "₹"}
                </span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder={currency === "USD" ? "299.00" : "25000"}
                  value={amountInput}
                  onChange={(e) => {
                    setActivePresetLabel(null);
                    setAmountInput(e.target.value);
                  }}
                  className="bg-transparent w-full text-slate-900 font-mono font-semibold placeholder:text-slate-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 mb-1.5">
                Merchant Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setActivePresetLabel(null);
                  setCategory(e.target.value);
                }}
                className="w-full bg-[#faf9ff] border border-[#e3ddf3] hover:border-[#c8bce8] focus:bg-white focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/15 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium outline-none transition-all"
              >
                <option value="electronics" className="bg-white text-slate-900">Electronics (Permitted)</option>
                <option value="hardware" className="bg-white text-slate-900">Hardware (Permitted)</option>
                <option value="cloud" className="bg-white text-slate-900">Cloud Compute (Permitted)</option>
                <option value="office" className="bg-white text-slate-900">Office Supplies (Permitted)</option>
                <option value="luxury" className="bg-white text-slate-900">Luxury Assets (Blocked by Policy)</option>
              </select>
            </div>
          </div>

          {/* Merchant & Business Justification Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 mb-1.5">
                Supplier / Merchant
              </label>
              <input
                type="text"
                placeholder="e.g. Apple Inc, AWS India"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full bg-[#faf9ff] border border-[#e3ddf3] hover:border-[#c8bce8] focus:bg-white focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/15 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs placeholder:text-slate-400 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 mb-1.5">
                Purpose / Justification
              </label>
              <input
                type="text"
                placeholder="e.g. Dev workstation setup"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#faf9ff] border border-[#e3ddf3] hover:border-[#c8bce8] focus:bg-white focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/15 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs placeholder:text-slate-400 outline-none transition-all"
              />
            </div>
          </div>

          {/* Live Dynamic Guardrail Policy Simulator */}
          <div
            className={`rounded-2xl border border-l-[3px] p-3.5 flex items-start gap-3 transition-colors ${
              !guardrailPreview.willPass
                ? "bg-rose-50 border-rose-200 border-l-rose-500 text-rose-800"
                : guardrailPreview.pendingInput
                ? "bg-[#f8f7fc] border-[#ebe6fa] border-l-slate-400 text-slate-700"
                : "bg-emerald-50 border-emerald-200 border-l-emerald-500 text-emerald-900"
            }`}
          >
            {!guardrailPreview.willPass ? (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : guardrailPreview.pendingInput ? (
              <ShieldCheck className="w-4 h-4 text-[#7c3aed] shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5 min-w-0">
              <p className="font-bold text-xs">{guardrailPreview.title}</p>
              <p className="text-[11px] opacity-85 leading-relaxed">{guardrailPreview.detail}</p>
            </div>
          </div>
        </form>

        {/* Pinned Footer — One-Click Save Preset + Save & Lock Escrow */}
        <div className="relative shrink-0 border-t border-[#ece8f8] px-6 py-4 bg-[#f8f7fc] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleOneClickSavePreset}
              disabled={!name.trim() && !amountInput.trim()}
              title="One-click save this order configuration as a reusable preset"
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                justSavedPreset
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "bg-white hover:bg-violet-50 border-[#e3ddf3] text-slate-700"
              }`}
            >
              {justSavedPreset ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-3.5 h-3.5 text-[#7c3aed]" />
                  <span>Save Preset</span>
                </>
              )}
            </button>
          </div>

          <button
            type="submit"
            form="custom-procure-form"
            disabled={loading}
            className={`flex-1 sm:flex-initial sm:min-w-[205px] px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 ${
              guardrailPreview.willPass
                ? "btn-violet"
                : "bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Locking Escrow...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-3.5 h-3.5" />
                <span>{guardrailPreview.willPass ? "Save & Lock Escrow" : "Test Guardrail Block"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
