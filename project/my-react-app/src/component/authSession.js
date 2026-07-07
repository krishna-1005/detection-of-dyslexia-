/* ═══════════════════════════════════════════════════════
   Session Helper — Robust Cross-Sandbox Persistence
   ═══════════════════════════════════════════════════════ */

export const setUserSession = (user, token) => {
  if (user) {
    localStorage.setItem("lexiflow_user", JSON.stringify(user));
    // Save to cookie as fallback for sandboxed/preview browser environments
    document.cookie = `lexiflow_user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`;
  }
  if (token) {
    localStorage.setItem("lexiflow_token", token);
    document.cookie = `lexiflow_token=${token}; path=/; max-age=86400; SameSite=Lax`;
  }
};

export const getUserSession = () => {
  let user = null;
  
  // 1. Try reading from LocalStorage
  try {
    const localUser = localStorage.getItem("lexiflow_user");
    if (localUser) {
      user = JSON.parse(localUser);
    }
  } catch (e) {
    console.warn("LocalStorage access blocked or corrupted:", e);
  }

  // 2. Fallback to Cookie verification (essential for some sandboxed reloads)
  if (!user) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; lexiflow_user=`);
    if (parts.length === 2) {
      try {
        const cookieVal = parts.pop().split(';').shift();
        user = JSON.parse(decodeURIComponent(cookieVal));
        
        // Restore local storage if it was cleared in sandboxed reload
        localStorage.setItem("lexiflow_user", JSON.stringify(user));
      } catch (e) {
        console.warn("Cookie parsing failed:", e);
      }
    }
  }
  return user;
};

export const clearUserSession = () => {
  try {
    localStorage.removeItem("lexiflow_user");
    localStorage.removeItem("lexiflow_token");
  } catch (e) {}
  
  // Clear cookies
  document.cookie = "lexiflow_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = "lexiflow_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
};
