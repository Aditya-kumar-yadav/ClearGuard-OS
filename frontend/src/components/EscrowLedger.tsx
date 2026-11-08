"use client";

import React, { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  colorSchemeDark,
} from "ag-grid-community";
import {
  CheckCircle2,
  ShieldAlert,
  Truck,
  Eye,
  X,
  FileText,
  AlertTriangle,
} from "lucide-react";
import confetti from "canvas-confetti";

ModuleRegistry.registerModules([AllCommunityModule]);

// AG Grid v36 Dark Quartz Theme
const darkTheme = themeQuartz.withPart(colorSchemeDark);

interface Transaction {
  id: string;
  item_name: string;
  category: string;
  amount: number;
  currency: string;
  merchant_name: string;
  status: "AUTHORIZED" | "CAPTURED" | "BLOCKED" | "DISPUTED";
  block_reason: string | null;
  paypal_order_id: string | null;
  paypal_auth_id: string | null;
  paypal_capture_id: string | null;
  paypal_dispute_id: string | null;
  dispute_reason: string | null;
  dispute_evidence: string | null;
  tracking_number: string | null;
  carrier: string | null;
  delivery_status: string;
  created_at: string;
  api_payload?: any;
}

interface EscrowLedgerProps {
  transactions: Transaction[];
  onSimulateDelivery: (transactionId: string) => Promise<void>;
  loading: boolean;
}

export const EscrowLedger: React.FC<EscrowLedgerProps> = ({
  transactions,
  onSimulateDelivery,
  loading,
}) => {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const handleCaptureClick = async (txId: string) => {
    try {
      await onSimulateDelivery(txId);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const columnDefs: ColDef<Transaction>[] = useMemo(
    () => [
      {
        field: "id",
        headerName: "TX ID",
        width: 140,
        cellRenderer: (params: any) => (
          <span className="font-mono text-xs text-sky-400 font-bold">
            {params.value}
          </span>
        ),
      },
      {
        field: "item_name",
        headerName: "Item & Merchant",
        flex: 2,
        minWidth: 260,
        cellRenderer: (params: any) => (
          <div className="flex flex-col py-1">
            <span className="text-xs font-semibold text-zinc-100 truncate">
              {params.value}
            </span>
            <span className="text-[11px] text-zinc-400">
              {params.data?.merchant_name} &bull; {params.data?.category}
            </span>
          </div>
        ),
      },
      {
        field: "amount",
        headerName: "Amount",
        width: 130,
        cellRenderer: (params: any) => (
          <span className="font-mono text-xs font-bold text-white">
            ₹{params.value?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        field: "status",
        headerName: "Status of Money",
        width: 210,
        cellRenderer: (params: any) => {
          const status = params.value;
          if (status === "AUTHORIZED") {
            return (
              <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                Authorized (Locked)
              </span>
            );
          }
          if (status === "CAPTURED") {
            return (
              <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-sky-400" />
                Captured (Paid)
              </span>
            );
          }
          if (status === "DISPUTED") {
            return (
              <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-400" />
                DISPUTED (Refund Demanded)
              </span>
            );
          }
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-400" />
              BLOCKED (403 Violation)
            </span>
          );
        },
      },
      {
        field: "paypal_order_id",
        headerName: "PayPal Reference",
        width: 210,
        cellRenderer: (params: any) => {
          const tx: Transaction = params.data;
          if (tx.paypal_dispute_id) {
            return (
              <span className="font-mono text-[11px] text-amber-400 font-bold">
                Claim: {tx.paypal_dispute_id}
              </span>
            );
          }
          if (tx.paypal_capture_id) {
            return (
              <span className="font-mono text-[11px] text-sky-300">
                Cap: {tx.paypal_capture_id}
              </span>
            );
          }
          if (tx.paypal_order_id) {
            return (
              <span className="font-mono text-[11px] text-emerald-300">
                Ord: {tx.paypal_order_id}
              </span>
            );
          }
          return (
            <span className="text-[11px] text-zinc-500 font-mono italic">
              Intercepted Before PayPal
            </span>
          );
        },
      },
      {
        headerName: "Audit / Escrow",
        width: 170,
        cellRenderer: (params: any) => {
          const tx: Transaction = params.data;
          if (tx.status === "AUTHORIZED") {
            return (
              <div className="flex items-center space-x-2 py-1">
                <button
                  onClick={() => handleCaptureClick(tx.id)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold font-mono transition-colors shadow-sm flex items-center space-x-1"
                >
                  <Truck className="w-3 h-3 mr-1" />
                  <span>Release</span>
                </button>
                <button
                  onClick={() => setSelectedTx(tx)}
                  className="p-1 text-zinc-400 hover:text-white"
                  title="Inspect Telematics"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            );
          }
          return (
            <button
              onClick={() => setSelectedTx(tx)}
              className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1 py-1 font-mono"
            >
              <FileText className="w-3.5 h-3.5 mr-1 text-zinc-500" />
              <span>Audit Log</span>
            </button>
          );
        },
      },
    ],
    [loading]
  );

  return (
    <div className="brutalist-card rounded-xl p-5 border border-zinc-800 space-y-4">
      {/* Table Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-white uppercase tracking-tight">
              AG Grid Live Escrow Ledger
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
              REAL-TIME FEED
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Real-time multi-agent authorizations, smart escrow holds, and autonomous PayPal dispute settlements
          </p>
        </div>
      </div>

      {/* AG Grid Container */}
      <div className="w-full h-[420px] rounded-lg overflow-hidden border border-zinc-800">
        <AgGridReact
          theme={darkTheme}
          rowData={transactions}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
          }}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50]}
          animateRows={true}
        />
      </div>

      {/* Detail / Audit Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div>
                <h4 className="text-sm font-bold text-white font-mono flex items-center">
                  AUDIT LOG: {selectedTx.id}
                </h4>
                <p className="text-xs text-zinc-400">{selectedTx.item_name}</p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-black p-3 rounded-lg border border-zinc-800 font-mono">
                <div>
                  <span className="text-zinc-500 block">Amount:</span>
                  <span className="text-white font-bold">₹{selectedTx.amount?.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Status:</span>
                  <span
                    className={
                      selectedTx.status === "AUTHORIZED"
                        ? "text-emerald-400 font-bold"
                        : selectedTx.status === "CAPTURED"
                        ? "text-sky-400 font-bold"
                        : selectedTx.status === "DISPUTED"
                        ? "text-amber-400 font-bold"
                        : "text-rose-400 font-bold"
                    }
                  >
                    {selectedTx.status}
                  </span>
                </div>
                {selectedTx.paypal_order_id && (
                  <div className="col-span-2">
                    <span className="text-zinc-500 block">PayPal Order ID:</span>
                    <span className="text-zinc-200">{selectedTx.paypal_order_id}</span>
                  </div>
                )}
                {selectedTx.paypal_auth_id && (
                  <div className="col-span-2">
                    <span className="text-zinc-500 block">PayPal Authorization (Escrow Freeze):</span>
                    <span className="text-emerald-400 font-bold">{selectedTx.paypal_auth_id}</span>
                  </div>
                )}
                {selectedTx.paypal_dispute_id && (
                  <div className="col-span-2">
                    <span className="text-zinc-500 block">PayPal Dispute ID:</span>
                    <span className="text-amber-400 font-bold">{selectedTx.paypal_dispute_id}</span>
                  </div>
                )}
                {selectedTx.tracking_number && (
                  <div className="col-span-2">
                    <span className="text-zinc-500 block">Carrier Tracking:</span>
                    <span className="text-zinc-300">{selectedTx.carrier} &bull; {selectedTx.tracking_number}</span>
                  </div>
                )}
              </div>

              {selectedTx.api_payload && (
                <div className="bg-black border border-zinc-800 rounded-lg p-3 text-zinc-300 space-y-1.5 font-mono">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                    <span className="font-bold text-[10px] uppercase text-sky-400">
                      PAYPAL ORDERS v2 RAW JSON AUDIT
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-zinc-900 border border-zinc-700 text-zinc-300">
                      {selectedTx.api_payload.live_call ? "LIVE REST API CALL" : "SANDBOX PROTOCOL"}
                    </span>
                  </div>
                  <pre className="text-[10px] text-zinc-400 overflow-x-auto max-h-48 scrollbar-thin p-1 leading-tight">
                    {JSON.stringify(selectedTx.api_payload, null, 2)}
                  </pre>
                </div>
              )}

              {selectedTx.dispute_evidence && (
                <div className="bg-amber-950/40 border border-amber-500/40 rounded-lg p-3 text-amber-300">
                  <span className="font-bold block mb-1 font-mono uppercase">Gemini AI Auto-Dispute Evidence:</span>
                  <p className="font-mono text-[11px] leading-relaxed">{selectedTx.dispute_evidence}</p>
                </div>
              )}

              {selectedTx.block_reason && (
                <div className="bg-rose-950/40 border border-rose-500/40 rounded-lg p-3 text-rose-300">
                  <span className="font-bold block mb-1 font-mono uppercase">OpenGuardrails Interception:</span>
                  <p className="font-sans leading-relaxed">{selectedTx.block_reason}</p>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold transition-colors"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

