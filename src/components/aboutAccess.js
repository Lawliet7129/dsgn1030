export const ABOUT_UNLOCK_KEY = "aboutPageUnlocked";

export function isAboutUnlocked() {
  return sessionStorage.getItem(ABOUT_UNLOCK_KEY) === "true";
}

export function markAboutUnlocked() {
  sessionStorage.setItem(ABOUT_UNLOCK_KEY, "true");
}

/**
 * Password verification is server-side only.
 * Frontend never stores or compares the real secret.
 */
export async function verifyAboutPassword(password) {
  try {
    const res = await fetch("/api/verify-about-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.ok === true;
  } catch {
    return false;
  }
}
