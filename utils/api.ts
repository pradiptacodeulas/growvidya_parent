import {
  apiFetch,
  getBaseApiUrl,
  getServerBaseUrl,
  getAvatarUrl,
  getFileUrl,
  cleanErrorMessage,
  setAuthToken,
  getAuthToken,
} from "@/services/apiClient";

export {
  apiFetch,
  getBaseApiUrl,
  getServerBaseUrl,
  getAvatarUrl,
  getFileUrl,
  cleanErrorMessage,
  setAuthToken,
  getAuthToken,
};

export const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs = 15000
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please check your internet connection.");
    }
    throw error;
  }
};

export const safeParseJson = async (response: Response): Promise<any> => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonSubString = text.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonSubString);
      } catch (innerErr) {
        // Fallback
      }
    }
    console.error("Non-JSON API Response:", text.substring(0, 500));
    throw new Error("Server returned an unparseable response.");
  }
};
