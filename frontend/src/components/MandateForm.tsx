"use client";

import React, { useState } from "react";
import { Sliders, ShieldCheck, Check } from "lucide-react";

interface MandateFormProps {
  mandate: {
    max_single_spend: number;
    total_budget: number;
    remaining_budget: number;
    allowed_categories: string;
  };
  onUpdate: (updated: any) => Promise<void>;
  loading: boolean;
}

export const MandateForm: React.FC<MandateFormProps> = ({
  mandate,
  onUpdate,
  loading,
}) => {
  const currentMax = mandate?.max_single_spend ?? (mandate as any)?.max_budget ?? 55000;
  const currentTotal = mandate?.total_budget ?? (mandate as any)?.total_pool ?? 250000;
  const [maxSpend, setMaxSpend] = useState(currentMax.toString());
  const [totalPool, setTotalPool] = useState(currentTotal.toString());
  const [categories, setCategories] = useState(mandate?.allowed_categories || "electronics,hardware,cloud,office");
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    if (mandate) {
      const mx = mandate?.max_single_spend ?? (mandate as any)?.max_budget ?? 55000;
      const tot = mandate?.total_budget ?? (mandate as any)?.total_pool ?? 250000;
      setMaxSpend(mx.toString());
      setTotalPool(tot.toString());
      if (mandate.allowed_categories) setCategories(mandate.allowed_categories);
    }
  }, [mandate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate({
      max_single_spend: parseFloat(maxSpend) || 55000,
      total_budget: parseFloat(totalPool) || 250000,
      allowed_categories: categories,
      require_escrow: true,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="brutalist-card rounded-xl p-5 border border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 flex items-center justify-center">
            <Sliders className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white uppercase">
              Autonomous Spending Mandate
            </h3>
            <p className="text-xs text-zinc-400">
              Deterministic code constraints enforced locally before calling PayPal
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
          STRICT GUARDRAILS ACTIVE
        </span>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-400 mb-1.5 uppercase">
            Per-Tx Cap Limit
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-zinc-500 font-mono text-xs">₹</span>
            <input
              type="number"
              value={maxSpend}
              onChange={(e) => setMaxSpend(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-lg pl-7 pr-3 py-2 text-xs font-mono text-white font-bold focus:outline-none focus:border-zinc-500 transition-colors"
              placeholder="55000"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-400 mb-1.5 uppercase">
            Total Budget Pool
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-zinc-500 font-mono text-xs">₹</span>
            <input
              type="number"
              value={totalPool}
              onChange={(e) => setTotalPool(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-lg pl-7 pr-3 py-2 text-xs font-mono text-white font-bold focus:outline-none focus:border-zinc-500 transition-colors"
              placeholder="250000"
            />
          </div>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-lg text-xs font-mono font-bold uppercase transition-all duration-150 flex items-center justify-center space-x-1.5 border ${
              saved
                ? "bg-emerald-600 border-emerald-500 text-white"
                : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 hover:border-zinc-500 text-zinc-200"
            }`}
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1" />
                <span>Mandate Enforced</span>
              </>
            ) : (
              <span>Save Spending Mandate</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

