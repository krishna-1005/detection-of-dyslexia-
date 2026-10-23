import { auth } from '../firebase';

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const fetchWithAuth = async (endpoint, options = {}) => {
  let token = null;
  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
    } catch (e) {
      console.warn("Failed to retrieve Firebase ID token:", e);
    }
  }

  // If no Firebase ID token, check for local demo user session
  if (!token) {
    try {
      const demoUserRaw = localStorage.getItem('cognilex_demo_user');
      if (demoUserRaw) {
        const demoUser = JSON.parse(demoUserRaw);
        const b64 = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
        const header = b64({ alg: "HS256", typ: "JWT" });
        const payload = b64({
          uid: demoUser.uid || "demo_patient_alex",
          user_id: demoUser.uid || "demo_patient_alex",
          email: demoUser.email || "alex.johnson@cognilex.ai",
          name: demoUser.displayName || demoUser.name || "Alex Johnson",
          role: demoUser.role || "patient"
        });
        token = `${header}.${payload}.dev_signature`;
      }
    } catch (err) {
      console.warn("Could not generate demo token:", err);
    }
  }

  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    console.warn("Authentication failed (401). Token may be expired or invalid.");
  }

  return response;
};
