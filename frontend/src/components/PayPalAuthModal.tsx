"use client";

import React, { useState } from "react";
import { Shield, Lock, CheckCircle2, X, ExternalLink, Key, UserCheck } from "lucide-react";
import { PayPalLogo } from "./BrandLogos";

interface PayPalAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectedAccount: any;
  onConnect: (accountData: any) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export const PayPalAuthModal: React.FC<PayPalAuthModalProps> = ({
  isOpen,
  onClose,
  connectedAccount,
  onConnect,
  onDisconnect,
}) => {
  const [email, setEmail] = useState("buyer-corp@personal.example.com");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [activeTab, setActiveTab] = useState<"instant" | "custom">("custom");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInstantConnect = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await onConnect({
        email: email || "buyer-corp@personal.example.com",
        payer_id: "PAYER_99A1B2C3",
        account_type: "PERSONAL_SANDBOX",
        status: "VERIFIED",
        balance: "₹2,50,000.00",
        delegation_approved: true,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not link PayPal account.");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await onConnect({
        email: email,
        client_id: clientId,
        client_secret: clientSecret,
        account_type: "DEVELOPER_SANDBOX",
        status: "VERIFIED",
        balance: "₹2,50,000.00",
        delegation_approved: true,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "PayPal Sandbox OAuth verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-slate-950/45 backdrop-blur-sm overscroll-contain">
      <div className="surface-card max-w-md w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl text-slate-900 border border-[#e5e0fa]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#ece8f8] pb-4 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#f3efff] border border-[#e2d6fe] flex items-center justify-center">
              <PayPalLogo className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-900">
                Connect PayPal Account
              </h3>
              <p className="text-[11px] font-mono text-slate-500">
                PayPal Sandbox Orders v2 &amp; Escrow Delegation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#f7f5fe] text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {connectedAccount ? (
          /* Already Connected State */
          <div className="space-y-4">
            <div className="border border-emerald-200 bg-emerald-50/70 rounded-2xl p-4 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">STATUS:</span>
                <span className="text-emerald-700 font-bold flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  AUTHENTICATED &bull; VERIFIED
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">PAYPAL ACCOUNT:</span>
                <span className="text-slate-900 font-bold">{connectedAccount.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">PAYER ID:</span>
                <span className="text-slate-700">{connectedAccount.payer_id || "PAYER_99A1B2C3"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">SANDBOX BALANCE:</span>
                <span className="text-slate-900 font-bold">{connectedAccount.balance || "₹2,50,000.00"}</span>
              </div>
              <div className="flex items-center justify-between border-t border-emerald-200 pt-2">
                <span className="text-slate-500">ESCROW DELEGATION:</span>
                <span className="text-emerald-700 font-bold">ACTIVE (Up to ₹55,000/Tx)</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Your AI Buyer Agent has delegated authority to hold Hostage Money up to your spending mandate. Funds remain in your account until delivery is verified.
            </p>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={async () => {
                  setLoading(true);
                  await onDisconnect();
                  setLoading(false);
                }}
                disabled={loading}
                className="flex-1 py-2.5 btn-secondary text-xs font-semibold"
              >
                Disconnect Account
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 btn-violet text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Connect Account Form */
          <div className="space-y-4">
            <div className="segmented-group w-full flex text-xs">
              <button
                onClick={() => setActiveTab("instant")}
                className={`flex-1 segmented-item text-center ${
                  activeTab === "instant" ? "segmented-item-active" : ""
                }`}
              >
                1-Click Test Buyer
              </button>
              <button
                onClick={() => setActiveTab("custom")}
                className={`flex-1 segmented-item text-center ${
                  activeTab === "custom" ? "segmented-item-active" : ""
                }`}
              >
                Developer API Keys
              </button>
            </div>

            {activeTab === "instant" ? (
              <div className="space-y-4 font-mono text-xs">
                <p className="text-slate-600 font-sans leading-relaxed text-xs">
                  Link a pre-configured <strong>PayPal Sandbox Personal Buyer Account</strong> with test funds:
                </p>

                <div>
                  <label className="block text-slate-600 mb-1 font-bold">
                    Sandbox Buyer Email:
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#f8f7fc] border border-[#e5e0fa] rounded-xl p-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-[#7c3aed] focus:bg-white"
                  />
                </div>

                <div className="border border-[#ebe6fa] bg-[#f8f7fc] rounded-xl p-3 space-y-1.5 text-[11px] text-slate-500">
                  <div className="flex justify-between">
                    <span>Default Test Wallet:</span>
                    <span className="text-slate-900 font-bold">₹2,50,000.00 INR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auth Intent:</span>
                    <span className="text-emerald-700 font-bold">AUTHORIZE (Escrow Hold)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dispute Claim Authority:</span>
                    <span className="text-[#6d28d9] font-bold">Gemini AI Delegated</span>
                  </div>
                </div>

                <button
                  onClick={handleInstantConnect}
                  disabled={loading}
                  className="w-full py-3 btn-violet text-xs font-bold flex items-center justify-center space-x-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Authorize &amp; Link PayPal Account</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleCustomConnect} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    PayPal Sandbox Client ID:
                  </label>
                  <input
                    type="text"
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="e.g. A21AA..."
                    className="w-full bg-[#f8f7fc] border border-[#e5e0fa] rounded-xl p-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-[#7c3aed] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    PayPal Sandbox Client Secret:
                  </label>
                  <input
                    type="password"
                    required
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                    className="w-full bg-[#f8f7fc] border border-[#e5e0fa] rounded-xl p-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-[#7c3aed] focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 btn-violet text-xs font-bold mt-2"
                >
                  {loading ? "Verifying OAuth with PayPal..." : "Verify & Save Sandbox Credentials"}
                </button>
              </form>
            )}

            {errorMsg && (
              <div className="border border-rose-200 bg-rose-50 rounded-xl p-2.5 text-xs font-mono text-rose-700">
                {errorMsg}
              </div>
            )}

            <div className="pt-2 border-t border-[#ece8f8] text-[11px] text-slate-500 flex items-center justify-between font-sans">
              <span>Get sandbox test accounts at:</span>
              <a
                href="https://developer.paypal.com/dashboard/accounts"
                target="_blank"
                rel="noreferrer"
                className="text-[#6d28d9] font-semibold hover:underline flex items-center"
              >
                <span>developer.paypal.com</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

