"use client";

import React, { useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  colorSchemeLight,
  themeQuartz,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
  type ICellRendererParams,
} from "ag-grid-community";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  Hash,
  Loader2,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * Light lilac-white-violet palette synchronized with globals.css & reference SaaS theme.
 */
const CLEARGUARD_GRID_PALETTE = {
  background: "#ffffff",
  chrome: "#f7f5fe",
  oddRow: "#fcfbff",
  rowHover: "#f3efff",
  selectedRow: "rgba(124, 58, 237, 0.08)",
  border: "#ece8f8",
  foreground: "#111827",
  cellText: "#1f2937",
  accent: "#7c3aed",
} as const;

const clearGuardLightTheme = themeQuartz.withPart(colorSchemeLight).withParams({
  backgroundColor: CLEARGUARD_GRID_PALETTE.background,
  chromeBackgroundColor: CLEARGUARD_GRID_PALETTE.chrome,
  oddRowBackgroundColor: CLEARGUARD_GRID_PALETTE.oddRow,
  rowHoverColor: CLEARGUARD_GRID_PALETTE.rowHover,
  selectedRowBackgroundColor: CLEARGUARD_GRID_PALETTE.selectedRow,
  borderColor: CLEARGUARD_GRID_PALETTE.border,
  foregroundColor: CLEARGUARD_GRID_PALETTE.foreground,
  cellTextColor: CLEARGUARD_GRID_PALETTE.cellText,
  accentColor: CLEARGUARD_GRID_PALETTE.accent,
  menuBackgroundColor: CLEARGUARD_GRID_PALETTE.background,
  wrapperBorderRadius: 14,
  headerHeight: 42,
  rowHeight: 58,
  headerFontSize: 11,
  cellFontSize: 12,
});

export type InspectorTab = "hash_chain" | "maker_checker" | "vision" | "paypal";

export interface TransactionsAgGridProps {
  transactions: any[];
  currency: "USD" | "INR";
  rate?: number;
  busyAction: string | null;
  formatTxMoney: (tx: any) => string;
  formatMoney: (inrAmount: number | string | undefined | null) => string;
  onInspect: (tx: any, tab?: InspectorTab) => void;
  onAuthorize: (paypalOrderId: string) => void;
  onCapture: (txId: string) => void;
  onVoid: (txId: string) => void;
  onDelete: (txId: string) => void;
}

function getNormalizedInr(tx: any, rate: number): number {
  if (tx?.amount_inr != null) {
    const val = Number(tx.amount_inr);
    return Number.isFinite(val) ? val : 0;
  }
  const raw = Number(tx?.amount || 0);
  if (!Number.isFinite(raw)) return 0;
  return String(tx?.currency || "INR").toUpperCase() === "USD" ? raw * rate : raw;
}

function getStatusTone(status: string) {
  switch (status) {
    case "CAPTURED":
      return {
        label: "CAPTURED",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: "check",
      };
    case "AUTHORIZED":
      return {
        label: "ESCROW LOCKED",
        badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
        icon: "lock",
      };
    case "ORDER_CREATED":
    case "AUTHORIZATION_PENDING":
      return {
        label: "AWAITING APPROVAL",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
        icon: "lock",
      };
    case "BLOCKED":
    case "VOIDED":
    case "DISPUTED":
      return {
        label: status,
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
        icon: "alert",
      };
    default:
      return {
        label: status || "UNKNOWN",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        icon: "lock",
      };
  }
}

export const TransactionsAgGrid: React.FC<TransactionsAgGridProps> = ({
  transactions,
  currency,
  rate = 85.0,
  busyAction,
  formatTxMoney,
  formatMoney,
  onInspect,
  onAuthorize,
  onCapture,
  onVoid,
  onDelete,
}) => {
  const gridApiRef = useRef<GridApi | null>(null);
  const [quickFilter, setQuickFilter] = useState("");

  const kpis = useMemo(() => {
    let lockedInr = 0;
    let settledInr = 0;
    let blockedCount = 0;

    for (const tx of transactions) {
      const inr = getNormalizedInr(tx, rate);
      if (tx.status === "AUTHORIZED") lockedInr += inr;
      else if (tx.status === "CAPTURED") settledInr += inr;
      else if (tx.status === "BLOCKED") blockedCount += 1;
    }

    return {
      totalCount: transactions.length,
      lockedInr,
      settledInr,
      blockedCount,
    };
  }, [transactions, rate]);

  const handleExportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    gridApiRef.current?.exportDataAsCsv({
      fileName: `clearguard-escrow-audit-${stamp}.csv`,
      columnKeys: [
        "id",
        "item_name",
        "merchant_name",
        "category",
        "amount_inr_sort",
        "status",
        "paypal_order_id",
        "vision_score_sort",
        "state_hash",
        "created_at",
      ],
    });
  };

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        colId: "id",
        field: "id",
        headerName: "Order TX",
        minWidth: 155,
        maxWidth: 190,
        filter: "agTextColumnFilter",
        cellRenderer: (params: ICellRendererParams) => {
          const tx = params.data;
          if (!tx) return null;
          const dateLabel = tx.created_at
            ? new Date(tx.created_at).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Live";
          return (
            <div className="flex flex-col justify-center leading-tight py-1">
              <span className="font-mono text-[11px] font-bold text-slate-900 truncate">
                {tx.id}
              </span>
              <span className="font-mono text-[10px] text-slate-400 mt-0.5 truncate">
                {dateLabel}
              </span>
            </div>
          );
        },
      },
      {
        colId: "item_name",
        field: "item_name",
        headerName: "Procurement Item & Merchant",
        flex: 1.5,
        minWidth: 230,
        filter: "agTextColumnFilter",
        valueGetter: (params) =>
          `${params.data?.item_name || ""} ${params.data?.merchant_name || ""} ${params.data?.category || ""}`,
        cellRenderer: (params: ICellRendererParams) => {
          const tx = params.data;
          if (!tx) return null;
          return (
            <div className="flex flex-col justify-center leading-tight py-1 min-w-0">
              <span className="text-xs font-semibold text-slate-900 truncate" title={tx.item_name}>
                {tx.item_name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                <span className="text-[10px] text-slate-500 truncate">
                  {tx.merchant_name || "Commercial Vendor"}
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-violet-50 border border-violet-200 text-violet-700 shrink-0">
                  {tx.category || "electronics"}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        colId: "amount_inr_sort",
        headerName: `Amount (${currency})`,
        minWidth: 125,
        maxWidth: 150,
        filter: "agNumberColumnFilter",
        valueGetter: (params) => getNormalizedInr(params.data, rate),
        valueFormatter: (params) => (params.data ? formatTxMoney(params.data) : ""),
        cellRenderer: (params: ICellRendererParams) => {
          const tx = params.data;
          if (!tx) return null;
          return (
            <div className="flex items-center justify-end h-full font-mono text-xs font-bold text-slate-900 tabular-nums">
              {formatTxMoney(tx)}
            </div>
          );
        },
      },
      {
        colId: "status",
        field: "status",
        headerName: "Escrow Status",
        minWidth: 165,
        maxWidth: 190,
        filter: "agTextColumnFilter",
        cellRenderer: (params: ICellRendererParams) => {
          const tx = params.data;
          if (!tx) return null;
          const tone = getStatusTone(tx.status);
          return (
            <div className="flex items-center h-full">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-semibold tracking-wide uppercase ${tone.badgeClass}`}
              >
                {tone.icon === "check" ? (
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                ) : tone.icon === "alert" ? (
                  <ShieldAlert className="w-3 h-3 shrink-0" />
                ) : (
                  <Lock className="w-3 h-3 shrink-0" />
                )}
                {tone.label}
              </span>
            </div>
          );
        },
      },
      {
        colId: "paypal_order_id",
        field: "paypal_order_id",
        headerName: "PayPal Escrow IDs",
        minWidth: 195,
        flex: 1,
        filter: "agTextColumnFilter",
        valueGetter: (params) => {
          const tx = params.data;
          if (!tx) return "";
          return [tx.paypal_order_id, tx.paypal_auth_id, tx.paypal_capture_id, tx.paypal_dispute_id]
            .filter(Boolean)
            .join(" ");
        },
        cellRenderer: (params: ICellRendererParams) => {
          const tx = params.data;
          if (!tx) return null;
          const primaryId =
            tx.paypal_capture_id || tx.paypal_auth_id || tx.paypal_order_id || "POLICY_GUARDED";
          const secondaryTag = tx.paypal_capture_id
            ? "CAP"
            : tx.paypal_auth_id
            ? "AUTH"
            : tx.paypal_order_id
            ? "ORD"
            : "GATE";

          return (
            <div className="flex items-center gap-1.5 h-full min-w-0">
              <button
                type="button"
                onClick={() => onInspect(tx, "paypal")}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#f7f5fe] hover:bg-violet-100/70 border border-[#e5e0fa] text-[10px] font-mono text-slate-700 truncate cursor-pointer transition-colors"
                title="Inspect full PayPal Orders/Payments v2 JSON telemetry"
              >
                <span className="text-[9px] text-violet-700 font-bold">{secondaryTag}</span>
                <span className="truncate max-w-[115px]">{primaryId}</span>
              </button>
              {tx.status === "ORDER_CREATED" && tx.approval_url && (
                <a
                  href={tx.approval_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Approve order on PayPal Sandbox"
                  className="p-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 shrink-0 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          );
        },
      },
      {
        colId: "vision_score_sort",
        headerName: "Vision POD Audit",
        minWidth: 165,
        maxWidth: 195,
        filter: "agNumberColumnFilter",
        valueGetter: (params) => {
          const analysis = params.data?.vision_audit?.analysis || params.data?.vision_audit;
          const score = Number(analysis?.integrity_score ?? -1);
          return Number.isFinite(score) && score >= 0 ? Math.round(score * 100) : -1;
        },
        cellRenderer: (params: ICellRendererParams) => {
          const tx = params.data;
          if (!tx) return null;
          if (tx.status === "BLOCKED") {
            return (
              <span className="text-[10px] font-mono text-rose-600 uppercase font-semibold">
                Pre-Purchase Blocked
              </span>
            );
          }

          const analysis = tx.vision_audit?.analysis || tx.vision_audit;
          const verdict = analysis?.verdict ? String(analysis.verdict) : "";
          const rawScore = Number(analysis?.integrity_score);
          const pct = Number.isFinite(rawScore) ? Math.round(rawScore * 100) : null;
          const attempts = Number(tx.vision_mismatch_attempts || 0);
          const maxAttempts = Number(tx.max_vision_mismatch_attempts || 3);
          const passed = tx.vision_approved === true || analysis?.recommended_action === "CAPTURE_ESCROW";

          return (
            <button
              type="button"
              onClick={() => onInspect(tx, "vision")}
              className="flex flex-col justify-center w-full text-left py-1 cursor-pointer group"
              title="Open Gemini Vision forensic proof breakdown"
            >
              <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                <span
                  className={
                    passed
                      ? "text-emerald-700 font-semibold"
                      : verdict && verdict !== "AWAITING_PHYSICAL_DELIVERY"
                      ? "text-amber-700 font-semibold"
                      : "text-slate-500 group-hover:text-violet-700"
                  }
                >
                  {passed
                    ? "VERIFIED POD"
                    : attempts > 0
                    ? `RETRY ${attempts}/${maxAttempts}`
                    : "AWAITING POD"}
                </span>
                {pct !== null && (
                  <span className="text-slate-700 font-semibold tabular-nums">{pct}%</span>
                )}
              </div>
              <div className="w-full h-1.5 rounded-full bg-violet-100 overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full transition-all ${
                    passed
                      ? "bg-emerald-500"
                      : pct !== null && pct >= 50
                      ? "bg-amber-500"
                      : "bg-violet-300"
                  }`}
                  style={{ width: `${pct !== null ? Math.max(8, Math.min(100, pct)) : 0}%` }}
                />
              </div>
            </button>
          );
        },
      },
      {
        colId: "state_hash",
        field: "state_hash",
        headerName: "SHA-256 Chain",
        minWidth: 135,
        maxWidth: 160,
        filter: "agTextColumnFilter",
        cellRenderer: (params: ICellRendererParams) => {
          const tx = params.data;
          if (!tx) return null;
          const hashStr = String(tx.state_hash || "PENDING_HASH");
          return (
            <button
              type="button"
              onClick={() => onInspect(tx, "hash_chain")}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#f7f5fe] hover:bg-violet-100/70 border border-[#e5e0fa] text-[10px] font-mono text-violet-700 cursor-pointer transition-colors"
              title={`Verify immutable SHA-256 chain (${hashStr})`}
            >
              <Hash className="w-3 h-3 text-violet-600 shrink-0" />
              <span>{hashStr.slice(0, 10)}...</span>
            </button>
          );
        },
      },
      {
        colId: "actions",
        headerName: "Actions",
        minWidth: 215,
        maxWidth: 250,
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: (params: ICellRendererParams) => {
          const tx = params.data;
          if (!tx) return null;
          const isPending = tx.status === "ORDER_CREATED" || tx.status === "AUTHORIZATION_PENDING";
          const isAuth = tx.status === "AUTHORIZED";
          const paypalOrderId = tx.paypal_order_id || tx.id;
          const isDeleting = busyAction === `delete:${tx.id}`;
          const isAuthing = busyAction === `auth:${paypalOrderId}`;
          const isCapturing = busyAction === `capture:${tx.id}`;
          const isVoiding = busyAction === `void:${tx.id}`;

          return (
            <div className="flex items-center justify-end gap-1.5 h-full">
              {isPending && (
                <button
                  type="button"
                  disabled={Boolean(busyAction)}
                  onClick={() => onAuthorize(paypalOrderId)}
                  className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-[10px] font-semibold text-white disabled:opacity-40 cursor-pointer transition-colors shadow-sm"
                >
                  {isAuthing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Auth"}
                </button>
              )}

              {isAuth && (
                <>
                  <button
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={() => onCapture(tx.id)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-semibold text-white disabled:opacity-40 cursor-pointer transition-colors shadow-sm"
                  >
                    {isCapturing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Capture"}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={() => onVoid(tx.id)}
                    className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[10px] font-semibold text-rose-700 disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    {isVoiding ? <Loader2 className="w-3 h-3 animate-spin" /> : "Void"}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => onInspect(tx, "hash_chain")}
                title="Open full SHA-256, Maker-Checker, Vision & PayPal Audit Inspector"
                className="p-1.5 rounded-lg bg-[#f7f5fe] hover:bg-violet-100/70 border border-[#e5e0fa] text-slate-600 hover:text-violet-700 cursor-pointer transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={() => onDelete(tx.id)}
                title="Delete order"
                aria-label={`Delete order ${tx.id}`}
                className="p-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 disabled:opacity-40 cursor-pointer transition-colors"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          );
        },
      },
    ],
    [currency, rate, busyAction, formatTxMoney, onInspect, onAuthorize, onCapture, onVoid, onDelete]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      floatingFilter: false,
      suppressHeaderMenuButton: false,
    }),
    []
  );

  const onGridReady = (event: GridReadyEvent) => {
    gridApiRef.current = event.api;
  };

  return (
    <div className="surface-card rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Enterprise Grid Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-[10px] font-mono font-semibold text-violet-700 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            AG Grid Escrow Audit Ledger
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-[#f7f5fe] border border-[#ebe6fa] text-slate-600">
              Rows: <strong className="text-slate-900">{kpis.totalCount}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-200 text-violet-700">
              In Escrow: <strong>{formatMoney(kpis.lockedInr)}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
              Settled: <strong>{formatMoney(kpis.settledInr)}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
              Blocked: <strong>{kpis.blockedCount}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              placeholder="Filter TX, merchant, PayPal ID, hash..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#f7f5fe] border border-[#e5e0fa] focus:border-violet-500 focus:bg-white focus:outline-none text-xs text-slate-900 placeholder:text-slate-400 font-mono"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
            title="Export filtered escrow audit log as CSV"
          >
            <Download className="w-3.5 h-3.5 text-violet-600" />
            Export CSV
          </button>
        </div>
      </div>

      {/* AG Grid v36 Enterprise Data Grid */}
      <div className="w-full h-[540px] rounded-[14px] overflow-hidden border border-[#ece8f8]">
        <AgGridReact
          theme={clearGuardLightTheme}
          rowData={transactions}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilter}
          onGridReady={onGridReady}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 25, 50]}
          animateRows={true}
          getRowId={(params) => String(params.data?.id)}
          overlayNoRowsTemplate='<span class="text-xs font-mono text-slate-500">No escrow transactions match the active filter.</span>'
        />
      </div>
    </div>
  );
};
