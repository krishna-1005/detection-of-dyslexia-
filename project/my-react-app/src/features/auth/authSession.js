/* ═══════════════════════════════════════════════════════
   Session Helper — Robust Cross-Sandbox Persistence
   ═══════════════════════════════════════════════════════ */

export const setUserSession = (user, token, rememberMe = true) => {
  if (user) {
    const userStr = JSON.stringify(user);
    if (rememberMe) {
      localStorage.setItem("cognilex_user", userStr);
      sessionStorage.removeItem("cognilex_user");
      // 30 days expiration cookie
      document.cookie = `cognilex_user=${encodeURIComponent(userStr)}; path=/; max-age=2592000; SameSite=Lax`;
    } else {
      sessionStorage.setItem("cognilex_user", userStr);
      localStorage.removeItem("cognilex_user");
      // Session cookie (expires when browser session ends)
      document.cookie = `cognilex_user=${encodeURIComponent(userStr)}; path=/; SameSite=Lax`;
    }
  }
  if (token) {
    if (rememberMe) {
      localStorage.setItem("cognilex_token", token);
      sessionStorage.removeItem("cognilex_token");
      document.cookie = `cognilex_token=${token}; path=/; max-age=2592000; SameSite=Lax`;
    } else {
      sessionStorage.setItem("cognilex_token", token);
      localStorage.removeItem("cognilex_token");
      document.cookie = `cognilex_token=${token}; path=/; SameSite=Lax`;
    }
  }
};

export const getUserSession = () => {
  let user = null;
  
  // 1. Try reading from LocalStorage
  try {
    const localUser = localStorage.getItem("cognilex_user");
    if (localUser) {
      user = JSON.parse(localUser);
    }
  } catch (e) {
    console.warn("LocalStorage access blocked or corrupted:", e);
  }

  // 2. Try reading from SessionStorage
  if (!user) {
    try {
      const sessionUser = sessionStorage.getItem("cognilex_user");
      if (sessionUser) {
        user = JSON.parse(sessionUser);
      }
    } catch (e) {
      console.warn("SessionStorage access blocked or corrupted:", e);
    }
  }

  // 3. Fallback to Cookie verification (essential for sandboxed reloads)
  if (!user) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; cognilex_user=`);
    if (parts.length === 2) {
      try {
        const cookieVal = parts.pop().split(';').shift();
        user = JSON.parse(decodeURIComponent(cookieVal));
        
        // Restore local storage if cookie exists
        localStorage.setItem("cognilex_user", JSON.stringify(user));
      } catch (e) {
        console.warn("Cookie parsing failed:", e);
      }
    }
  }
  return user;
};

export const clearUserSession = () => {
  try {
    localStorage.removeItem("cognilex_user");
    localStorage.removeItem("cognilex_token");
    sessionStorage.removeItem("cognilex_user");
    sessionStorage.removeItem("cognilex_token");
  } catch (e) {}
  
  // Clear cookies
  document.cookie = "cognilex_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = "cognilex_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
};
