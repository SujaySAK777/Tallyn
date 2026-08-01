const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8091/api";
const API_FALLBACK_BASE_URLS = [
  API_BASE_URL,
  "http://localhost:8091/api",
  "http://127.0.0.1:8091/api",
  "http://localhost:8080/api"
].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index);

export async function apiRequest(path, options = {}) {
  let lastNetworkError = null;

  for (const baseUrl of API_FALLBACK_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        },
        ...options
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const parsed = JSON.parse(errorText);
          throw new Error(parsed.message || parsed.errorCode || `Request failed with status ${response.status}`);
        } catch {
          throw new Error(errorText || `Request failed with status ${response.status}`);
        }
      }

      if (response.status === 204) {
        return null;
      }

      return response.json();
    } catch (error) {
      // Only continue to fallback hosts for network-level failures.
      if (error?.name === "TypeError") {
        lastNetworkError = error;
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Unable to reach payment API. Tried: ${API_FALLBACK_BASE_URLS.join(", ")}. ` +
      `Please ensure backend is running and CORS is enabled. ${lastNetworkError?.message || ""}`
  );
}
