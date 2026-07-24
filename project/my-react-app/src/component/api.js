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
