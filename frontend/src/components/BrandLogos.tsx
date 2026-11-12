"use client";

import React, { useId } from "react";

interface LogoProps {
  className?: string;
}

/** Authentic layered geometric PayPal double-P monogram. */
export const PayPalLogo: React.FC<LogoProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <path
      d="M11.6 4.5H20.4C24.2 4.5 26.3 6.5 25.7 10.1C25 14.3 22.1 16.6 17.8 16.6H15.1C14.5 16.6 14 17 13.9 17.6L12.6 25.5C12.5 26 12.1 26.3 11.6 26.3H7.4C6.8 26.3 6.4 25.8 6.5 25.2L9.8 5.8C10 5 10.7 4.5 11.6 4.5Z"
      fill="#0070BA"
    />
    <path
      d="M15.4 9.8H22.6C25.9 9.8 27.8 11.6 27.2 14.8C26.5 18.6 23.9 20.8 20.1 20.8H17.6C17 20.8 16.5 21.2 16.4 21.8L15.3 28C15.2 28.4 14.9 28.7 14.4 28.7H11.1C10.6 28.7 10.3 28.3 10.4 27.8L13.6 10.9C13.7 10.2 14.4 9.8 15.4 9.8Z"
      fill="#38BDF8"
      fillOpacity="0.92"
    />
  </svg>
);

/** Official Google Gemini four-point curved star mark with smooth brand gradient. */
export const GeminiLogo: React.FC<LogoProps> = ({ className = "w-5 h-5" }) => {
  const gradId = useId();
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="2" y1="2" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="38%" stopColor="#9B72CB" />
          <stop offset="72%" stopColor="#D96570" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
      </defs>
      <path
        d="M14 1.5C14.7 8.4 19.6 13.3 26.5 14C19.6 14.7 14.7 19.6 14 26.5C13.3 19.6 8.4 14.7 1.5 14C8.4 13.3 13.3 8.4 14 1.5Z"
        fill={`url(#${gradId})`}
      />
    </svg>
  );
};

/** Optical camera aperture & glass lens mark for Gemini Vision inspection. */
export const VisionLensLogo: React.FC<LogoProps> = ({ className = "w-5 h-5" }) => {
  const gradId = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={gradId} cx="42%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="45%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#1E293B" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="12" fill="#0F172A" stroke="#FACC15" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="8.4" fill="#111827" stroke="#EAB308" strokeOpacity="0.45" strokeWidth="1" />
      <circle cx="16" cy="16" r="5.2" fill={`url(#${gradId})`} />
      <circle cx="14.1" cy="14" r="1.4" fill="#FFFFFF" fillOpacity="0.85" />
      <path d="M16 4.5V7.5M16 24.5V27.5M4.5 16H7.5M24.5 16H27.5" stroke="#FDE047" strokeOpacity="0.55" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
};

/** ClearGuard / AuroraPay metallic shield prism emblem. */
export const AuroraShieldLogo: React.FC<LogoProps> = ({ className = "w-5 h-5" }) => {
  const gradId = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1ED760" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
      <path
        d="M16 3L27 7.4V15.5C27 22.1 22.3 27.6 16 29.4C9.7 27.6 5 22.1 5 15.5V7.4L16 3Z"
        fill="#090D12"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
      />
      <path
        d="M11.8 16.3L14.7 19.2L20.6 12.8"
        stroke="#1ED760"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
