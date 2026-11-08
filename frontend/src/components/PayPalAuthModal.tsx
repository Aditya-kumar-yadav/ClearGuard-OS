"use client";

import React, { useState } from "react";
import { Shield, Lock, CheckCircle2, X, ExternalLink, Key, UserCheck } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"instant" | "custom">("instant");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleInstantConnect = async () => {
    setLoading(true);
    await onConnect({
      email: email || "buyer-corp@personal.example.com",
      payer_id: "PAYER_99A1B2C3",
      account_type: "PERSONAL_SANDBOX",
      status: "VERIFIED",
      balance: "₹2,50,000.00",
      delegation_approved: true,
    });
    setLoading(false);
    onClose();
  };

  const handleCustomConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onConnect({
      email: email,
      client_id: clientId,
      client_secret: clientSecret,
      account_type: "DEVELOPER_SANDBOX",
      status: "VERIFIED",
      balance: "₹2,50,000.00",
      delegation_approved: true,
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-black border-2 border-white rounded-none max-w-md w-full p-6 shadow-2xl text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-4 mb-5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold">
              PP
            </div>
            <div>
              <h3 className="text-base font-extrabold uppercase tracking-tight text-white">
                Connect PayPal Account
              </h3>
              <p className="text-[11px] font-mono text-zinc-400">
                PayPal Sandbox Orders v2 &amp; Escrow Delegation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {connectedAccount ? (
          /* Already Connected State */
          <div className="space-y-4">
            <div className="border border-emerald-500/40 bg-zinc-950 p-4 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">STATUS:</span>
                <span className="text-emerald-400 font-bold flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  AUTHENTICATED &bull; VERIFIED
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">PAYPAL ACCOUNT:</span>
                <span className="text-white font-bold">{connectedAccount.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">PAYER ID:</span>
                <span className="text-zinc-300">{connectedAccount.payer_id || "PAYER_99A1B2C3"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">SANDBOX BALANCE:</span>
                <span className="text-white font-bold">{connectedAccount.balance || "₹2,50,000.00"}</span>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
                <span className="text-zinc-500">ESCROW DELEGATION:</span>
                <span className="text-emerald-400 font-bold">ACTIVE (Up to ₹55,000/Tx)</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Your AI Buyer Agent has delegated authority to hold Hostage Money up to your spending mandate. Funds remain in your account until you confirm delivery.
            </p>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={async () => {
                  setLoading(true);
                  await onDisconnect();
                  setLoading(false);
                }}
                disabled={loading}
                className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-mono text-xs font-bold uppercase transition-colors"
              >
                Disconnect Account
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-white hover:bg-zinc-200 text-black font-mono text-xs font-bold uppercase transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Connect Account Form */
          <div className="space-y-4">
            <div className="flex border border-zinc-800 font-mono text-xs">
              <button
                onClick={() => setActiveTab("instant")}
                className={`flex-1 py-2 font-bold uppercase transition-colors ${
                  activeTab === "instant"
                    ? "bg-white text-black"
                    : "bg-black text-zinc-400 hover:text-white"
                }`}
              >
                1-Click Test Buyer
              </button>
              <button
                onClick={() => setActiveTab("custom")}
                className={`flex-1 py-2 font-bold uppercase transition-colors ${
                  activeTab === "custom"
                    ? "bg-white text-black"
                    : "bg-black text-zinc-400 hover:text-white"
                }`}
              >
                Developer API Keys
              </button>
            </div>

            {activeTab === "instant" ? (
              <div className="space-y-4 font-mono text-xs">
                <p className="text-zinc-400 font-sans leading-relaxed text-xs">
                  For the hackathon demo, link a pre-configured <strong>PayPal Sandbox Personal Buyer Account</strong> with test funds:
                </p>

                <div>
                  <label className="block text-zinc-400 mb-1 font-bold">
                    Sandbox Buyer Email:
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 p-2 text-white font-mono text-xs focus:outline-none focus:border-white"
                  />
                </div>

                <div className="border border-zinc-800 bg-zinc-950 p-3 space-y-1.5 text-[11px] text-zinc-400">
                  <div className="flex justify-between">
                    <span>Default Test Wallet:</span>
                    <span className="text-white font-bold">₹2,50,000.00 INR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auth Intent:</span>
                    <span className="text-emerald-400 font-bold">AUTHORIZE (Escrow Hold)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dispute Claim Authority:</span>
                    <span className="text-amber-400 font-bold">Gemini AI Delegated</span>
                  </div>
                </div>

                <button
                  onClick={handleInstantConnect}
                  disabled={loading}
                  className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-extrabold uppercase tracking-wide transition-colors flex items-center justify-center space-x-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Authorize &amp; Link PayPal Account</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleCustomConnect} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">
                    PayPal Sandbox Client ID:
                  </label>
                  <input
                    type="text"
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="e.g. A21AA..."
                    className="w-full bg-zinc-950 border border-zinc-700 p-2 text-white font-mono text-xs focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">
                    PayPal Sandbox Client Secret:
                  </label>
                  <input
                    type="password"
                    required
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                    className="w-full bg-zinc-950 border border-zinc-700 p-2 text-white font-mono text-xs focus:outline-none focus:border-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-extrabold uppercase tracking-wide transition-colors mt-2"
                >
                  Save Sandbox Credentials
                </button>
              </form>
            )}

            <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between font-sans">
              <span>Get sandbox test accounts at:</span>
              <a
                href="https://developer.paypal.com/dashboard/accounts"
                target="_blank"
                rel="noreferrer"
                className="text-white hover:underline flex items-center"
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

