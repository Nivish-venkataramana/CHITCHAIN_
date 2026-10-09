/**
 * Client-Side Authenticated API Request Helper
 * Automatically includes the Privy Access Token in the Authorization Bearer header.
 */

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  getAccessToken?: () => Promise<string | null>
): Promise<Response> {
  const headers = new Headers(init?.headers);

  // Retrieve short-lived JWT from Privy if available
  if (getAccessToken) {
    try {
      const token = await getAccessToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    } catch (err) {
      console.warn("Failed to retrieve Privy access token:", err);
    }
  }

  // Include active dev user fallback header if set
  if (typeof window !== "undefined") {
    const activeDevUser = localStorage.getItem("chitchain_dev_user");
    if (activeDevUser && !headers.has("x-dev-user")) {
      headers.set("x-dev-user", activeDevUser);
    }
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
