"use client";

import React, { useState, useEffect } from "react";
import { X, DollarSign, Sliders, Check, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";

interface SetAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: "USD" | "INR";
  onSetCurrency: (curr: "USD" | "INR") => void;
  currentBalance: number; // in INR
  currentMaxSpend: number; // in INR
  onSave: (newBalanceInr: number, newMaxSpendInr: number) => Promise<void>;
  loading: boolean;
}

export const SetAmountModal: React.FC<SetAmountModalProps> = ({
  isOpen,
  onClose,
  currency,
  onSetCurrency,
  currentBalance,
  currentMaxSpend,
  onSave,
  loading,
}) => {
  const RATE = 85.0;

  // Local state in current display currency
  const [balanceInput, setBalanceInput] = useState<string>("");
  const [maxSpendInput, setMaxSpendInput] = useState<string>("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (currency === "USD") {
        setBalanceInput((currentBalance / RATE).toFixed(2));
        setMaxSpendInput((currentMaxSpend / RATE).toFixed(2));
      } else {
        setBalanceInput(currentBalance.toFixed(2));
        setMaxSpendInput(currentMaxSpend.toFixed(2));
      }
    }
  }, [isOpen, currency, currentBalance, currentMaxSpend]);

  if (!isOpen) return null;

  const handleCurrencyChange = (newCurr: "USD" | "INR") => {
    if (newCurr === currency) return;
    const currentVal = parseFloat(balanceInput) || 0;
    const currentMax = parseFloat(maxSpendInput) || 0;

    if (newCurr === "USD") {
      // INR to USD
      setBalanceInput((currentVal / RATE).toFixed(2));
      setMaxSpendInput((currentMax / RATE).toFixed(2));
    } else {
      // USD to INR
      setBalanceInput((currentVal * RATE).toFixed(2));
      setMaxSpendInput((currentMax * RATE).toFixed(2));
    }
    onSetCurrency(newCurr);
  };

  const handleStepBalance = (delta: number) => {
    const val = parseFloat(balanceInput) || 0;
    const newVal = Math.max(0, val + delta);
    setBalanceInput(newVal.toFixed(2));
  };

  const handleStepMaxSpend = (delta: number) => {
    const val = parseFloat(maxSpendInput) || 0;
    const newVal = Math.max(0, val + delta);
    setMaxSpendInput(newVal.toFixed(2));
  };

  const handlePresetSelect = (amount: number) => {
    setBalanceInput(amount.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputVal = parseFloat(balanceInput) || 0;
    const inputMax = parseFloat(maxSpendInput) || 0;

    const inrBalance = currency === "USD" ? inputVal * RATE : inputVal;
    const inrMaxSpend = currency === "USD" ? inputMax * RATE : inputMax;

    await onSave(inrBalance, inrMaxSpend);
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 } });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-slate-950/45 backdrop-blur-sm overscroll-contain">
      <div className="surface-card max-w-md w-full max-h-[92vh] overflow-y-auto p-6 text-slate-900 font-sans shadow-2xl space-y-5 border border-[#e5e0fa]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#ece8f8] pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f3efff] border border-[#e2d6fe] flex items-center justify-center">
              <Sliders className="w-4 h-4 text-[#6d28d9]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                Configure Wallet &amp; Spending Cap
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Set custom balance, currency, &amp; transaction mandate
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#f7f5fe] rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Currency Toggle */}
          <div>
            <label className="block text-xs font-mono text-slate-500 mb-1.5">
              ACTIVE CURRENCY:
            </label>
            <div className="segmented-group w-full flex">
              <button
                type="button"
                onClick={() => handleCurrencyChange("USD")}
                className={`flex-1 segmented-item text-center ${
                  currency === "USD" ? "segmented-item-active" : ""
                }`}
              >
                USD ($) &bull; United States Dollar
              </button>
              <button
                type="button"
                onClick={() => handleCurrencyChange("INR")}
                className={`flex-1 segmented-item text-center ${
                  currency === "INR" ? "segmented-item-active" : ""
                }`}
              >
                INR (₹) &bull; Indian Rupee
              </button>
            </div>
          </div>

          {/* Wallet Balance Input with Stepper */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-slate-500">
                WALLET ESCROW BALANCE ({currency}):
              </label>
              <span className="text-[11px] font-mono text-[#6d28d9] font-semibold">
                Available Funds
              </span>
            </div>

            <div className="flex items-center bg-[#f8f7fc] border border-[#e5e0fa] rounded-xl overflow-hidden focus-within:border-[#7c3aed] focus-within:bg-white transition-all">
              <span className="px-3.5 text-slate-400 font-mono font-bold">
                {currency === "USD" ? "$" : "₹"}
              </span>
              <input
                type="number"
                step="any"
                required
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                placeholder="126300.00"
                className="bg-transparent w-full py-2.5 text-sm font-mono text-slate-900 font-bold outline-none"
              />
              <div className="flex border-l border-[#e5e0fa]">
                <button
                  type="button"
                  onClick={() => handleStepBalance(currency === "USD" ? -1000 : -10000)}
                  className="px-3 py-2 text-slate-500 hover:text-[#6d28d9] hover:bg-[#f3efff] font-mono font-bold text-xs transition-colors"
                  title="Minus"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => handleStepBalance(currency === "USD" ? 1000 : 10000)}
                  className="px-3 py-2 text-slate-500 hover:text-[#6d28d9] hover:bg-[#f3efff] font-mono font-bold text-xs transition-colors"
                  title="Plus"
                >
                  +
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center space-x-1.5 mt-2 flex-wrap gap-y-1">
              <span className="text-[10px] font-mono text-slate-400 mr-1">PRESETS:</span>
              {currency === "USD" ? (
                <>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect(10000)}
                    className="px-2 py-0.5 rounded-md bg-[#f7f5fe] hover:bg-[#ede9fe] text-[10px] font-mono text-slate-600 transition-colors"
                  >
                    $10k
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect(50000)}
                    className="px-2 py-0.5 rounded-md bg-[#f7f5fe] hover:bg-[#ede9fe] text-[10px] font-mono text-slate-600 transition-colors"
                  >
                    $50k
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect(126300)}
                    className="px-2 py-0.5 rounded-md bg-violet-50 hover:bg-violet-100 text-[10px] font-mono text-[#6d28d9] font-bold border border-violet-200 transition-colors"
                  >
                    $126,300
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect(250000)}
                    className="px-2 py-0.5 rounded-md bg-[#f7f5fe] hover:bg-[#ede9fe] text-[10px] font-mono text-slate-600 transition-colors"
                  >
                    $250k
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect(100000)}
                    className="px-2 py-0.5 rounded-md bg-[#f7f5fe] hover:bg-[#ede9fe] text-[10px] font-mono text-slate-600 transition-colors"
                  >
                    ₹1L
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect(250000)}
                    className="px-2 py-0.5 rounded-md bg-violet-50 hover:bg-violet-100 text-[10px] font-mono text-[#6d28d9] font-bold border border-violet-200 transition-colors"
                  >
                    ₹2.5L
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect(500000)}
                    className="px-2 py-0.5 rounded-md bg-[#f7f5fe] hover:bg-[#ede9fe] text-[10px] font-mono text-slate-600 transition-colors"
                  >
                    ₹5L
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Max Spending Cap Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-slate-500">
                MAX PER-TRANSACTION CAP ({currency}):
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                OpenGuardrails Cap
              </span>
            </div>

            <div className="flex items-center bg-[#f8f7fc] border border-[#e5e0fa] rounded-xl overflow-hidden focus-within:border-[#7c3aed] focus-within:bg-white transition-all">
              <span className="px-3.5 text-slate-400 font-mono font-bold">
                {currency === "USD" ? "$" : "₹"}
              </span>
              <input
                type="number"
                step="any"
                required
                value={maxSpendInput}
                onChange={(e) => setMaxSpendInput(e.target.value)}
                placeholder="647.06"
                className="bg-transparent w-full py-2.5 text-sm font-mono text-slate-900 font-bold outline-none"
              />
              <div className="flex border-l border-[#e5e0fa]">
                <button
                  type="button"
                  onClick={() => handleStepMaxSpend(currency === "USD" ? -50 : -5000)}
                  className="px-3 py-2 text-slate-500 hover:text-[#6d28d9] hover:bg-[#f3efff] font-mono font-bold text-xs transition-colors active:scale-90"
                  title="Minus"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => handleStepMaxSpend(currency === "USD" ? 50 : 5000)}
                  className="px-3 py-2 text-slate-500 hover:text-[#6d28d9] hover:bg-[#f3efff] font-mono font-bold text-xs transition-colors active:scale-90"
                  title="Plus"
                >
                  +
                </button>
              </div>
            </div>

            {/* Quick Cap Presets */}
            <div className="flex items-center space-x-1.5 mt-2 flex-wrap gap-y-1">
              <span className="text-[10px] font-mono text-slate-400 mr-1">CAP PRESETS:</span>
              {currency === "USD" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setMaxSpendInput((25000 / RATE).toFixed(2))}
                    className="px-2 py-0.5 rounded-md bg-[#f7f5fe] hover:bg-[#ede9fe] text-[10px] font-mono text-slate-600 transition-colors active:scale-95"
                  >
                    $294
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaxSpendInput((55000 / RATE).toFixed(2))}
                    className="px-2 py-0.5 rounded-md bg-violet-50 hover:bg-violet-100 text-[10px] font-mono text-[#6d28d9] font-bold border border-violet-200 transition-colors active:scale-95"
                  >
                    $647 (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaxSpendInput((80000 / RATE).toFixed(2))}
                    className="px-2 py-0.5 rounded-md bg-[#f7f5fe] hover:bg-[#ede9fe] text-[10px] font-mono text-slate-600 transition-colors active:scale-95"
                  >
                    $941
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setMaxSpendInput((25000).toFixed(2))}
                    className="px-2 py-0.5 rounded-md bg-[#f7f5fe] hover:bg-[#ede9fe] text-[10px] font-mono text-slate-600 transition-colors active:scale-95"
                  >
                    ₹25k
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaxSpendInput((55000).toFixed(2))}
                    className="px-2 py-0.5 rounded-md bg-violet-50 hover:bg-violet-100 text-[10px] font-mono text-[#6d28d9] font-bold border border-violet-200 transition-colors active:scale-95"
                  >
                    ₹55k (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaxSpendInput((80000).toFixed(2))}
                    className="px-2 py-0.5 rounded-md bg-[#f7f5fe] hover:bg-[#ede9fe] text-[10px] font-mono text-slate-600 transition-colors active:scale-95"
                  >
                    ₹80k
                  </button>
                </>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
              Any procurement above this cap is blocked with HTTP 403 Forbidden.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary py-2.5 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-violet py-2.5 text-xs font-bold flex items-center justify-center space-x-1.5 shadow-lg"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Applied!</span>
                </>
              ) : loading ? (
                <>
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Save &amp; Apply</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

