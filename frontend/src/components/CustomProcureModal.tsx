"use client";

import React, { useState } from "react";
import { X, ShoppingBag, ShieldCheck, CreditCard, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";

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

  if (!isOpen) return null;

  const currentCap = currency === "USD" ? maxSingleSpendInr / RATE : maxSingleSpendInr;
  const currentBudget = currency === "USD" ? remainingBudgetInr / RATE : remainingBudgetInr;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredAmount = parseFloat(amountInput) || 0;
    const amountInInr = currency === "USD" ? enteredAmount * RATE : enteredAmount;

    await onProcure({
      name: name || "Custom Requested Asset",
      category: category,
      amount: amountInInr,
      merchant: merchant || "Commercial Merchant Direct",
      description: description || "Autonomous AI procurement request",
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="surface-card max-w-lg w-full p-6 text-white font-sans shadow-2xl space-y-5 border border-[#272935]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#21232d] pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#16171d] border border-[#262833] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-[#00d084]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                Procure Any Custom Item
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                AI Agent evaluates your spending mandate &bull; Locks smart escrow on PayPal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1a1c24] rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Budget Pill Reminder */}
        <div className="bg-[#14151c] border border-[#232532] rounded-xl p-3 flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-zinc-500 block text-[10px]">CURRENT SPENDING CAP</span>
            <span className="text-white font-bold">
              {currency === "USD" ? `$${currentCap.toFixed(2)}` : `₹${currentCap.toLocaleString("en-IN")}`} per item
            </span>
          </div>
          <div className="text-right">
            <span className="text-zinc-500 block text-[10px]">AVAILABLE ESCROW</span>
            <span className="text-[#00d084] font-bold">
              {currency === "USD" ? `$${currentBudget.toFixed(2)}` : `₹${currentBudget.toLocaleString("en-IN")}`}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          {/* Item Name */}
          <div>
            <label className="block text-zinc-400 mb-1">ITEM / ASSET NAME:</label>
            <input
              type="text"
              required
              placeholder="e.g. Apple MacBook Pro M3, NVIDIA H100 Cloud, Office Chair..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#14151a] border border-[#23252d] focus:border-[#00d084] rounded-xl px-3.5 py-2.5 text-white font-sans text-xs outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Amount */}
            <div>
              <label className="block text-zinc-400 mb-1">
                PRICE ({currency}):
              </label>
              <div className="flex items-center bg-[#14151a] border border-[#23252d] focus-within:border-[#00d084] rounded-xl px-3.5 py-2 transition-all">
                <span className="text-zinc-500 font-bold mr-2">
                  {currency === "USD" ? "$" : "₹"}
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder={currency === "USD" ? "499.00" : "42000"}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="bg-transparent w-full text-white font-bold outline-none"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-zinc-400 mb-1">MERCHANT CATEGORY:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#14151a] border border-[#23252d] focus:border-[#00d084] rounded-xl px-3 py-2.5 text-white outline-none cursor-pointer"
              >
                <option value="electronics">Electronics (Permitted)</option>
                <option value="hardware">Hardware (Permitted)</option>
                <option value="cloud">Cloud Compute (Permitted)</option>
                <option value="office">Office Supplies (Permitted)</option>
                <option value="luxury">Luxury Assets (Blocked by Gate)</option>
              </select>
            </div>
          </div>

          {/* Merchant Name */}
          <div>
            <label className="block text-zinc-400 mb-1">SUPPLIER / MERCHANT NAME:</label>
            <input
              type="text"
              placeholder="e.g. Apple Inc, AWS India, Dell Technologies, Swiss Chrono Vault..."
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full bg-[#14151a] border border-[#23252d] focus:border-[#00d084] rounded-xl px-3.5 py-2.5 text-white font-sans text-xs outline-none transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-zinc-400 mb-1">BUSINESS JUSTIFICATION / PURPOSE:</label>
            <input
              type="text"
              placeholder="e.g. Engineering workstation for autonomous pipeline development"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#14151a] border border-[#23252d] focus:border-[#00d084] rounded-xl px-3.5 py-2.5 text-white font-sans text-xs outline-none transition-all"
            />
          </div>

          {/* Policy Information Box */}
          <div className="bg-[#121319] border border-[#21232d] rounded-xl p-3 text-[11px] text-zinc-400 space-y-1 font-sans">
            <span className="font-bold text-zinc-300 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#00d084]" />
              Guardrail Interceptor Rules
            </span>
            <p>
              &bull; If price &gt; {currency === "USD" ? `$${currentCap.toFixed(2)}` : `₹${currentCap.toLocaleString("en-IN")}`}: Automatically intercepted (HTTP 403).
            </p>
            <p>
              &bull; If category is "luxury" or contains prohibited keywords: Intercepted by OpenGuardrails.
            </p>
            <p>
              &bull; If approved: Locks funds on PayPal Sandbox with <code className="text-zinc-200">intent: AUTHORIZE</code>.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center space-x-2.5 font-sans">
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
              className="flex-1 btn-mint py-2.5 text-xs font-bold flex items-center justify-center space-x-1.5 shadow-lg"
            >
              <CreditCard className="w-3.5 h-3.5 text-black" />
              <span>Submit &amp; Lock Escrow</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
