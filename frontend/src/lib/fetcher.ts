/**
 * AuroraPay OS - Hardened Fintech API Fetcher
 * Phase 2 & 3: Bulletproof Fallbacks, Timeout Handling & Graceful Degradation
 * 
 * Guarantees:
 * - 6.0s Strict Request Timeout with AbortController
 * - Intercepts 500 Internal Error, 503 Service Unavailable, 504 Gateway Timeout
 * - Dispatches brutalist error signal: "NETWORK ANOMALY: TRANSACTION SAFELY ABORTED."
 * - Zero UI freezing or unhandled promise crashes in dark-mode dashboard
 */

export interface FetcherOptions extends RequestInit {
  timeoutMs?: number;
  idempotencyKey?: string;
  silent?: boolean;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
  anomaly?: boolean;
}

export const NETWORK_ANOMALY_EVENT = "aurorapay:network-anomaly";

export function emitNetworkAnomaly(message = "NETWORK ANOMALY: TRANSACTION SAFELY ABORTED.") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(NETWORK_ANOMALY_EVENT, {
        detail: {
          title: "NETWORK ANOMALY: TRANSACTION SAFELY ABORTED.",
          message,
          timestamp: new Date().toISOString(),
        },
      })
    );
  }
}

export async function safeFetch<T = any>(
  url: string,
  options: FetcherOptions = {}
): Promise<ApiResponse<T>> {
  const {
    timeoutMs = 6000,
    idempotencyKey,
    headers = {},
    ...rest
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const mergedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(idempotencyKey ? { "PayPal-Request-Id": idempotencyKey } : {}),
    ...(headers as Record<string, string>),
  };

  try {
    const res = await fetch(url, {
      ...rest,
      headers: mergedHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse JSON safely
    let data: any;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    // Handle Unhappy Paths (500, 502, 503, 504)
    if (res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504) {
      const anomalyMessage = "NETWORK ANOMALY: TRANSACTION SAFELY ABORTED.";
      emitNetworkAnomaly(anomalyMessage);

      return {
        ok: false,
        status: res.status,
        data,
        error: anomalyMessage,
        anomaly: true,
      };
    }

    return {
      ok: res.ok,
      status: res.status,
      data,
      error: res.ok ? undefined : data?.detail?.reason || data?.detail?.message || data?.error,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);

    const isTimeout = err?.name === "AbortError";
    const anomalyMessage = isTimeout
      ? "NETWORK ANOMALY: TRANSACTION SAFELY ABORTED. (Request Timed Out)"
      : "NETWORK ANOMALY: TRANSACTION SAFELY ABORTED.";

    emitNetworkAnomaly(anomalyMessage);

    return {
      ok: false,
      status: isTimeout ? 504 : 0,
      data: {} as T,
      error: anomalyMessage,
      anomaly: true,
    };
  }
}

export const fetcher = {
  get: <T = any>(url: string, opts?: FetcherOptions) =>
    safeFetch<T>(url, { method: "GET", ...opts }),

  post: <T = any>(url: string, body?: any, opts?: FetcherOptions) =>
    safeFetch<T>(url, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...opts,
    }),

  put: <T = any>(url: string, body?: any, opts?: FetcherOptions) =>
    safeFetch<T>(url, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      ...opts,
    }),
};

