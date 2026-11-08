"use client";

import React, { useState } from "react";
import { Sparkles, Zap, Shield, Settings, Sliders, ChevronRight, Check } from "lucide-react";

interface EdgeDockRailProps {
  onOpenSettings: () => void;
  onFilterCategory?: (category: string) => void;
  activeCategory?: string;
  remainingBudget: number;
  maxSingleSpend: number;
  currency: "USD" | "INR";
  formatMoney: (amount: number | undefined | null) => string;
}

export const EdgeDockRail: React.FC<EdgeDockRailProps> = ({
  onOpenSettings,
  onFilterCategory,
  activeCategory = "all",
  remainingBudget,
  maxSingleSpend,
  currency,
  formatMoney,
}) => {
  const [hoveredGauge, setHoveredGauge] = useState<string | null>(null);

  // Play subtle physical click sound
  const playClick = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.018);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.018);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.02);
    } catch {
      // AudioContext not allowed or unsupported
    }
  };

  return (
    <aside className="relative flex items-center select-none" aria-label="Quick AI Rail">
      {/* Tooltip Popover */}
      {hoveredGauge && (
        <div className="absolute right-full mr-3.5 top-1/2 -translate-y-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-right-2 duration-150">
          <div className="surface-card p-3 shadow-2xl border border-[#2a2d3a] rounded-xl text-xs font-mono w-56 text-left space-y-1 bg-[#101117]/95 backdrop-blur-md">
            {hoveredGauge === "orange" && (
              <>
                <span className="text-[10px] text-orange-400 font-bold block flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mr-1.5 animate-pulse" />
                  ESCROW UTILIZATION: 73%
                </span>
                <p className="text-zinc-300 text-[11px] font-sans">
                  Available Spending Pool: <strong className="text-white">{formatMoney(remainingBudget)}</strong>
                </p>
                <span className="text-[9px] text-zinc-500 block">Click to view Flagship Hardware</span>
              </>
            )}
            {hoveredGauge === "mint" && (
              <>
                <span className="text-[10px] text-[#00d084] font-bold block flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00d084] mr-1.5 animate-pulse" />
                  MAKER AGENT CAP: 21%
                </span>
                <p className="text-zinc-300 text-[11px] font-sans">
                  Single-Spend Cap: <strong className="text-white">{formatMoney(maxSingleSpend)}</strong>
                </p>
                <span className="text-[9px] text-zinc-500 block">Click to view Cloud Compute</span>
              </>
            )}
            {hoveredGauge === "yellow" && (
              <>
                <span className="text-[10px] text-yellow-400 font-bold block flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mr-1.5 animate-pulse" />
                  AI VISION ACCURACY: 52%
                </span>
                <p className="text-zinc-300 text-[11px] font-sans">
                  Multi-modal POD Integrity Verifications Active
                </p>
                <span className="text-[9px] text-zinc-500 block">Click to test Spending Cap Block</span>
              </>
            )}
            {hoveredGauge === "gear" && (
              <>
                <span className="text-[10px] text-zinc-300 font-bold block">
                  ⚙️ MANDATE CONFIGURATION
                </span>
                <p className="text-zinc-400 text-[11px] font-sans">
                  Set wallet amount, currency (USD/INR), and transaction limits.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* The Organic Curved Notch Dock (Exact Match to User Reference Photo) */}
      <div className="relative flex flex-col items-center">
        {/* Top Smooth Concave Fillet Curve */}
        <div className="w-5 h-6 self-end overflow-hidden pointer-events-none">
          <div className="w-10 h-12 bg-black rounded-tr-[24px] -mt-6 -ml-5" />
        </div>

        {/* Vertical Dock Body */}
        <div className="bg-black border-l border-t border-b border-[#1c1d24] rounded-l-[32px] py-4 px-2.5 flex flex-col items-center space-y-4 shadow-2xl relative z-10">
          {/* Gauge 1: Orange Ring (73%) */}
          <button
            type="button"
            onClick={() => {
              playClick();
              if (onFilterCategory) onFilterCategory(activeCategory === "electronics" ? "all" : "electronics");
            }}
            onMouseEnter={() => setHoveredGauge("orange")}
            onMouseLeave={() => setHoveredGauge(null)}
            className={`group flex flex-col items-center focus:outline-none transition-transform duration-100 active:scale-90 ${
              activeCategory === "electronics" ? "scale-105" : ""
            }`}
            title="73% Escrow Utilization • Filter Hardware"
          >
            <div className="relative w-11 h-11 flex items-center justify-center">
              {/* SVG Circular Ring Gauge */}
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                <path
                  className="text-[#201511]"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#ff6a3d] transition-all duration-500 ease-out"
                  strokeDasharray="73, 100"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  style={{ filter: "drop-shadow(0 0 4px rgba(255, 106, 61, 0.6))" }}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>

              {/* Center Claude / Starburst Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white group-hover:scale-110 transition-transform"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" />
                </svg>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-zinc-300 mt-1 tracking-tight group-hover:text-orange-400 transition-colors">
              73%
            </span>
          </button>

          {/* Gauge 2: Mint Green Ring (21%) */}
          <button
            type="button"
            onClick={() => {
              playClick();
              if (onFilterCategory) onFilterCategory(activeCategory === "cloud" ? "all" : "cloud");
            }}
            onMouseEnter={() => setHoveredGauge("mint")}
            onMouseLeave={() => setHoveredGauge(null)}
            className={`group flex flex-col items-center focus:outline-none transition-transform duration-100 active:scale-90 ${
              activeCategory === "cloud" ? "scale-105" : ""
            }`}
            title="21% Single Spend Cap • Filter Cloud"
          >
            <div className="relative w-11 h-11 flex items-center justify-center">
              {/* SVG Circular Ring Gauge */}
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                <path
                  className="text-[#102319]"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#00d084] transition-all duration-500 ease-out"
                  strokeDasharray="21, 100"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  style={{ filter: "drop-shadow(0 0 5px rgba(0, 208, 132, 0.7))" }}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>

              {/* Center OpenAI / Swirl Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white group-hover:scale-110 transition-transform"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2a10 10 0 0 0-7.07 17.07l2.12-2.12A7 7 0 1 1 12 5V2z" />
                </svg>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-zinc-300 mt-1 tracking-tight group-hover:text-[#00d084] transition-colors">
              21%
            </span>
          </button>

          {/* Gauge 3: Lime Yellow Ring (52%) */}
          <button
            type="button"
            onClick={() => {
              playClick();
              if (onFilterCategory) onFilterCategory(activeCategory === "luxury" ? "all" : "luxury");
            }}
            onMouseEnter={() => setHoveredGauge("yellow")}
            onMouseLeave={() => setHoveredGauge(null)}
            className={`group flex flex-col items-center focus:outline-none transition-transform duration-100 active:scale-90 ${
              activeCategory === "luxury" ? "scale-105" : ""
            }`}
            title="52% AI Arbiter Accuracy • Test Security Gate"
          >
            <div className="relative w-11 h-11 flex items-center justify-center">
              {/* SVG Circular Ring Gauge */}
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                <path
                  className="text-[#202011]"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#eab308] transition-all duration-500 ease-out"
                  strokeDasharray="52, 100"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  style={{ filter: "drop-shadow(0 0 4px rgba(234, 179, 8, 0.6))" }}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>

              {/* Center Perplexity / Starburst Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-zinc-300 mt-1 tracking-tight group-hover:text-yellow-400 transition-colors">
              52%
            </span>
          </button>

          {/* Bottom Settings Button (Gear in separate curved bulb) */}
          <div className="pt-2 border-t border-[#1e2029]">
            <button
              type="button"
              onClick={() => {
                playClick();
                onOpenSettings();
              }}
              onMouseEnter={() => setHoveredGauge("gear")}
              onMouseLeave={() => setHoveredGauge(null)}
              className="w-10 h-10 rounded-full bg-[#14151a] hover:bg-[#20222a] border border-[#272935] flex items-center justify-center text-zinc-300 hover:text-white transition-all active:scale-90 shadow-md group"
              title="Configure Budget Mandate & Currency"
            >
              <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300 text-zinc-200" />
            </button>
          </div>
        </div>

        {/* Bottom Smooth Concave Fillet Curve */}
        <div className="w-5 h-6 self-end overflow-hidden pointer-events-none">
          <div className="w-10 h-12 bg-black rounded-br-[24px] mt-0 -ml-5" />
        </div>
      </div>
    </aside>
  );
};

