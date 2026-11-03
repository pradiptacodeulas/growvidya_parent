import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

let inMemoryToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export const setAuthToken = (token: string | null): void => {
  inMemoryToken = token;
};

export const getAuthToken = (): string | null => {
  return inMemoryToken;
};

export const setOnUnauthorized = (cb: (() => void) | null): void => {
  onUnauthorizedCallback = cb;
};

/**
 * Resolve host IP dynamically from Expo manifest on real devices / emulators during local dev
 */
const getHostFromExpo = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.hostUri;
  if (hostUri) {
    return hostUri.split(":")[0];
  }
  return null;
};

const resolveEnvUrl = (rawUrl?: string): string => {
  const cleanUrl = (rawUrl || "").trim().replace(/\/+$/, "");
  if (!cleanUrl) return "";

  if (Platform.OS !== "web" && (cleanUrl.includes("localhost") || cleanUrl.includes("127.0.0.1"))) {
    const host = getHostFromExpo() || (Platform.OS === "android" ? "10.0.2.2" : "localhost");
    return cleanUrl.replace(/localhost|127\.0\.0\.1/, host);
  }

  return cleanUrl;
};

/**
 * Resolve Base API URL directly from .env
 */
export const getBaseApiUrl = (): string => {
  const apiUrl = resolveEnvUrl(process.env.EXPO_PUBLIC_API_URL);
  if (apiUrl) return apiUrl;

  const serverUrl = resolveEnvUrl(process.env.EXPO_PUBLIC_SERVER_URL).replace(/\/api\/v1\/?$/, "");
  return serverUrl ? `${serverUrl}/api/v1` : "";
};

/**
 * Server base URL (for static uploads / assets)
 */
export const getServerBaseUrl = (): string => {
  const serverUrl = resolveEnvUrl(process.env.EXPO_PUBLIC_SERVER_URL).replace(/\/api\/v1\/?$/, "");
  if (serverUrl) return serverUrl;

  return getBaseApiUrl().replace(/\/api\/v1\/?$/, "");
};

/**
 * Resolve full Avatar URL from file path
 */
export const getAvatarUrl = (
  picture?: string | null,
  gender?: string | number | null
): string => {
  const base = getServerBaseUrl();
  const isFemale =
    Number(gender) === 2 ||
    String(gender).trim().toLowerCase() === "female" ||
    String(gender).trim().toLowerCase() === "f";
  const defaultAvatar = isFemale
    ? `${base}/vidya_assets/images/female-user.png`
    : `${base}/vidya_assets/images/male-user.png`;

  if (!picture || typeof picture !== "string" || picture.trim() === "") {
    return defaultAvatar;
  }

  const normalized = picture.trim().replace(/\\/g, "/");
  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("file:")
  ) {
    if (normalized.includes("via.placeholder.com")) {
      return defaultAvatar;
    }
    // Harmonize dev/localhost address to the active base
    if (/https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?/i.test(normalized)) {
      return normalized.replace(/https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?/i, base);
    }
    return normalized;
  }

  const clean = normalized.replace(/^public\//, "").replace(/^\/+/, "");
  return `${base}/${clean}`;
};

/**
 * Resolve full Document / Media URL
 */
export const getFileUrl = (filePath?: string | null): string => {
  if (!filePath || typeof filePath !== "string" || filePath.trim() === "") {
    return "";
  }
  const base = getServerBaseUrl();
  const normalized = filePath.trim().replace(/\\/g, "/");

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("file:")
  ) {
    // Harmonize dev/localhost address to the active base
    if (/https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?/i.test(normalized)) {
      return normalized.replace(/https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?/i, base);
    }
    return normalized;
  }

  const clean = normalized.replace(/^public\//, "").replace(/^\/+/, "");
  return `${base}/${clean}`;
};

const NON_ADMIN_SUBSCRIPTION_PAUSED_MSG =
  "School portal services are temporarily paused. Please contact your School Administration.";
const NON_ADMIN_FEATURE_DISABLED_MSG =
  "This module is currently not enabled for your school. Please contact your School Administration.";
const NON_ADMIN_STORAGE_FULL_MSG =
  "School cloud storage capacity has been reached. Please contact your School Administration.";

const SUBSCRIPTION_LOCK_CODES = new Set([
  "SUBSCRIPTION_EXPIRED",
  "SUBSCRIPTION_SUSPENDED",
  "SUBSCRIPTION_PENDING_APPROVAL",
  "SUBSCRIPTION_REQUIRED",
]);

const FEATURE_LOCK_CODES = new Set([
  "FEATURE_NOT_IN_PLAN",
  "FEATURE_NOT_INCLUDED",
]);

/**
 * Format user-friendly error messages
 */
export const cleanErrorMessage = (
  msg: any,
  fallback = "An unexpected error occurred. Please try again."
): string => {
  if (!msg) return fallback;
  if (typeof msg !== "string") return String(msg);

  const text = msg.trim();

  if (text.includes("Request failed with status 402") || text.includes("status code 402")) {
    return NON_ADMIN_SUBSCRIPTION_PAUSED_MSG;
  }

  if (
    text.toLowerCase().includes("upgrade your") ||
    text.toLowerCase().includes("not included in your")
  ) {
    return NON_ADMIN_FEATURE_DISABLED_MSG;
  }

  if (
    text.includes("Unexpected token") ||
    text.includes("JSON at position") ||
    text.includes("unparseable response")
  ) {
    return "The server returned an unexpected response. Please check your connection and try again.";
  }

  if (
    text === "Network request failed" ||
    text === "Failed to fetch" ||
    text === "Network Error" ||
    text.includes("Network Error") ||
    text.includes("ERR_NETWORK") ||
    text.includes("ECONNREFUSED")
  ) {
    return "Unable to connect to the server. Please check your internet connection.";
  }

  if (text.includes("timeout") || text.includes("timed out") || text.includes("ECONNABORTED")) {
    return "The request timed out. Please check your internet connection and try again.";
  }

  if (text.includes("Illegal mix of collations")) {
    return "One or more fields contain unsupported characters.";
  }

  if (text.includes("ER_DUP_ENTRY") || text.toLowerCase().includes("duplicate entry")) {
    return "A record with this information already exists.";
  }

  if (/^(failed|error|failed!|error!|something went wrong|an error occurred)$/i.test(text)) {
    return fallback;
  }

  return text;
};

/**
 * Universal apiFetch with automatic token injection and timeout
 */
export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 15000
): Promise<{ success: boolean; message?: string; data?: any; error?: string; status: number }> => {
  const base = getBaseApiUrl();
  const cleanEndpoint = endpoint.startsWith("http")
    ? endpoint
    : `${base}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  let token = inMemoryToken;
  if (!token) {
    try {
      const saved = await AsyncStorage.getItem("userData");
      if (saved) {
        const parsed = JSON.parse(saved);
        token = parsed?.token || parsed?.access_token || parsed?.data?.token || null;
        if (token) {
          inMemoryToken = token;
        }
      }
    } catch {
      // ignore
    }
  }

  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(cleanEndpoint, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const rawText = await response.text();
    let json: any = null;
    try {
      json = JSON.parse(rawText);
    } catch {
      // If server returned text or HTML
      const firstBrace = rawText.indexOf("{");
      const lastBrace = rawText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          json = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
        } catch (_) {}
      }
    }

    const isSuccess = response.ok && (json?.success === true || json?.status === true);
    const message = json?.message || (response.ok ? "Success" : `Request failed with status ${response.status}`);
    const data = json?.data !== undefined ? json.data : json;
    const errCode = json?.errors?.code || json?.code || null;

    if (!isSuccess) {
      if (
        response.status === 401 &&
        !endpoint.includes("/auth/login") &&
        !endpoint.includes("/auth/request-passcode") &&
        !endpoint.includes("/auth/verify-passcode")
      ) {
        inMemoryToken = null;
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }
      }
      let errMsg = cleanErrorMessage(message);
      if (response.status === 402 || (errCode && SUBSCRIPTION_LOCK_CODES.has(String(errCode)))) {
        errMsg = NON_ADMIN_SUBSCRIPTION_PAUSED_MSG;
      } else if (errCode && FEATURE_LOCK_CODES.has(String(errCode))) {
        errMsg = NON_ADMIN_FEATURE_DISABLED_MSG;
      } else if (errCode === "STORAGE_QUOTA_EXCEEDED") {
        errMsg = NON_ADMIN_STORAGE_FULL_MSG;
      }
      return {
        success: false,
        message: errMsg,
        error: errMsg,
        data,
        status: response.status,
      };
    }

    return {
      success: true,
      message,
      data,
      status: response.status,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      const msg = "Request timed out. Please check your internet connection.";
      return { success: false, message: msg, error: msg, status: 408 };
    }
    const msg = cleanErrorMessage(error?.message);
    return { success: false, message: msg, error: msg, status: 0 };
  }
};

export default {
  get: (endpoint: string, options: RequestInit = {}) =>
    apiFetch(endpoint, { ...options, method: "GET" }),
  post: (endpoint: string, body?: any, options: RequestInit = {}) =>
    apiFetch(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    }),
  put: (endpoint: string, body?: any, options: RequestInit = {}) =>
    apiFetch(endpoint, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    }),
  patch: (endpoint: string, body?: any, options: RequestInit = {}) =>
    apiFetch(endpoint, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    }),
  delete: (endpoint: string, options: RequestInit = {}) =>
    apiFetch(endpoint, { ...options, method: "DELETE" }),
};

/**
 * Robustly resolves the active student ID for parent-facing mobile screens.
 * CRITICAL: NEVER falls back to user.id, user.userId, or user.parentId
 * (which represent the parent's user record in the users/parents table, not the student record).
 */
export const resolveStudentId = (
  routeStudentId?: string | number | null,
  selectedStudentId?: string | number | null,
  dashboardData?: any,
  user?: any
): number | string | null => {
  // Collect all known linked student IDs from dashboard and user payload
  const childrenList = [
    ...(Array.isArray(dashboardData?.children) ? dashboardData.children : []),
    ...(Array.isArray(dashboardData?.parent_student) ? dashboardData.parent_student : []),
    ...(Array.isArray(user?.children) ? user.children : []),
  ];

  const knownStudentIds = new Set<string>();
  childrenList.forEach((c: any) => {
    const cid = c?.id || c?.student_id;
    if (cid !== undefined && cid !== null && !isNaN(Number(cid))) {
      knownStudentIds.add(String(cid));
    }
  });

  const explicitStudentIds = [
    dashboardData?.student_details?.id,
    dashboardData?.student_details?.student_id,
    dashboardData?.activeChild?.id,
    dashboardData?.activeChild?.student_id,
    user?.activeChild?.id,
    user?.activeChild?.student_id,
    user?.student_id,
    user?.studentId,
  ];

  explicitStudentIds.forEach((sid) => {
    if (sid !== undefined && sid !== null && !isNaN(Number(sid))) {
      knownStudentIds.add(String(sid));
    }
  });

  const parentIdStr = user?.id ? String(user.id) : null;
  const parentUserIdStr = user?.userId ? String(user.userId) : null;
  const parentParentIdStr = user?.parentId ? String(user.parentId) : null;

  // Only consider it an invalid parentId if it does NOT belong to known student IDs
  const isErroneousParentId = (val: any) => {
    if (!val) return false;
    const str = String(val);
    if (knownStudentIds.has(str)) return false; // Genuine student ID even if it matches parent ID number
    return str === parentIdStr || str === parentUserIdStr || str === parentParentIdStr;
  };

  // 1. Check route parameter (from navigation)
  if (routeStudentId && !isNaN(Number(routeStudentId)) && Number(routeStudentId) > 0 && !isErroneousParentId(routeStudentId)) {
    return Number(routeStudentId);
  }

  // 2. Check redux selectedStudentId (must not be parent ID)
  if (selectedStudentId && !isNaN(Number(selectedStudentId)) && Number(selectedStudentId) > 0 && !isErroneousParentId(selectedStudentId)) {
    return Number(selectedStudentId);
  }

  // 3. Check dashboard active student or first linked child
  const dashStudentId =
    dashboardData?.student_details?.id ||
    dashboardData?.student_details?.student_id ||
    dashboardData?.activeChild?.id ||
    dashboardData?.activeChild?.student_id ||
    dashboardData?.parent_student?.[0]?.id ||
    dashboardData?.parent_student?.[0]?.student_id ||
    dashboardData?.children?.[0]?.id ||
    dashboardData?.children?.[0]?.student_id;

  if (dashStudentId && !isNaN(Number(dashStudentId)) && Number(dashStudentId) > 0 && !isErroneousParentId(dashStudentId)) {
    return Number(dashStudentId);
  }

  // 4. Check user payload from login/session (activeChild or children list)
  const userStudentId =
    user?.studentId ||
    user?.student_id ||
    user?.activeChild?.id ||
    user?.activeChild?.student_id ||
    user?.children?.[0]?.id ||
    user?.children?.[0]?.student_id;

  if (userStudentId && !isNaN(Number(userStudentId)) && Number(userStudentId) > 0 && !isErroneousParentId(userStudentId)) {
    return Number(userStudentId);
  }

  // 5. Fallback to first known student ID
  if (knownStudentIds.size > 0) {
    const firstKnown = Array.from(knownStudentIds)[0];
    return Number(firstKnown);
  }

  return null;
};
