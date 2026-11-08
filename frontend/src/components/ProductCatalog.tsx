"use client";

import React, { useState } from "react";
import { ShoppingCart, ShieldAlert, CheckCircle2, Cpu, Zap, ArrowRight, Laptop, Watch, Server, Smartphone } from "lucide-react";

export interface Product {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  merchant: string;
  description: string;
  demo_type: "standard_safe" | "escrow_delivery" | "auto_dispute" | "rogue_ai_attack";
}

interface ProductCatalogProps {
  products: Product[];
  onProcure: (product: Product) => Promise<any>;
  loading: boolean;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  onProcure,
  loading,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [procureResult, setProcureResult] = useState<any>(null);

  const getIcon = (category: string, name: string) => {
    if (category === "luxury" || name.toLowerCase().includes("rolex")) {
      return <Watch className="w-5 h-5 text-rose-400" />;
    }
    if (name.toLowerCase().includes("oneplus") || name.toLowerCase().includes("phone")) {
      return <Smartphone className="w-5 h-5 text-white" />;
    }
    if (category === "cloud") {
      return <Server className="w-5 h-5 text-sky-400" />;
    }
    return <Laptop className="w-5 h-5 text-emerald-400" />;
  };

  const handleBuy = async (product: Product) => {
    setSelectedProduct(product.id);
    setProcureResult({ status: "LOADING", message: `AI agent submitting procurement payload for ${product.name}...` });
    try {
      const res = await onProcure(product);
      setProcureResult(res);
    } catch (e: any) {
      setProcureResult({ status: "ERROR", message: e.message });
    }
  };

  return (
    <div className="border border-zinc-800 bg-black p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-zinc-900 border border-zinc-700 flex items-center justify-center font-mono text-xs font-bold text-white">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white uppercase">
              Target Product Catalog (Thin Real Slice)
            </h3>
            <p className="text-[11px] font-mono text-zinc-400">
              5 Pre-seeded benchmark assets: Agent selects target &rarr; FastAPI checks &rarr; PayPal Orders v2
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300">
            DETERMINISTIC LATENCY &lt; 200MS
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold">
            0% HALLUCINATION RISK
          </span>
        </div>
      </div>

      {/* 5-Item Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {products.map((item) => {
          const isRogue = item.category === "luxury";
          const isOnePlus = item.name.toLowerCase().includes("oneplus");

          return (
            <div
              key={item.id}
              className={`p-3.5 border flex flex-col justify-between transition-all ${
                isRogue
                  ? "border-rose-900/60 bg-rose-950/10 hover:border-rose-600"
                  : isOnePlus
                  ? "border-white/50 bg-zinc-950 hover:border-white shadow-[0_0_15px_rgba(255,255,255,0.08)]"
                  : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 uppercase border ${
                      isRogue
                        ? "bg-rose-900/40 border-rose-700 text-rose-300"
                        : "bg-zinc-900 border-zinc-700 text-zinc-300"
                    }`}
                  >
                    {item.category}
                  </span>
                  {getIcon(item.category, item.name)}
                </div>

                <h4 className="text-xs font-bold text-white mb-1 leading-snug line-clamp-2">
                  {item.name}
                </h4>
                <p className="text-[10px] text-zinc-400 line-clamp-2 mb-2 font-mono">
                  {item.merchant}
                </p>
                <div className="text-sm font-extrabold font-mono text-white mb-3">
                  ₹{item.amount.toLocaleString("en-IN")}
                </div>
              </div>

              <button
                onClick={() => handleBuy(item)}
                disabled={loading}
                className={`w-full py-1.5 font-mono text-[11px] font-bold uppercase transition-colors flex items-center justify-center space-x-1 border ${
                  isRogue
                    ? "bg-rose-950/50 hover:bg-rose-900 border-rose-700 text-rose-200"
                    : isOnePlus
                    ? "bg-white hover:bg-zinc-200 text-black border-white"
                    : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200"
                }`}
              >
                <span>{isRogue ? "ATTEMPT BUY" : "PROCURE"}</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Outcome Banner */}
      {procureResult && (
        <div
          className={`p-3 border font-mono text-xs flex items-center justify-between ${
            procureResult.status === "BLOCKED"
              ? "border-rose-600 bg-rose-950/40 text-rose-200"
              : procureResult.status === "AUTHORIZED" || procureResult.status === "CAPTURED"
              ? "border-emerald-500 bg-emerald-950/40 text-emerald-200"
              : "border-zinc-800 bg-zinc-950 text-zinc-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            {procureResult.status === "BLOCKED" ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            ) : procureResult.status === "AUTHORIZED" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Zap className="w-4 h-4 text-zinc-400 animate-pulse shrink-0" />
            )}
            <div>
              <span className="font-bold">
                {procureResult.status === "BLOCKED"
                  ? "403 FORBIDDEN INTERCEPTION: "
                  : procureResult.status === "AUTHORIZED"
                  ? "ESCROW FUNDS LOCKED (ORDERS v2 AUTHORIZE): "
                  : "AI ENGINE EXECUTING: "}
              </span>
              <span>{procureResult.message || procureResult.reason}</span>
            </div>
          </div>

          {procureResult.paypal_order_id && (
            <span className="text-[10px] font-mono px-2 py-0.5 bg-black border border-emerald-500 text-emerald-300">
              PAYPAL ORDER: {procureResult.paypal_order_id}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

