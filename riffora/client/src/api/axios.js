import axios from 'axios';

/**
 * Single Axios instance for the whole app.
 * withCredentials: true → sends HTTP-only cookies with every request (required for auth).
 * baseURL proxied through Vite in dev, pointed at Render through VITE_API_URL
 * in production.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor — if we get 401, clear state (handled in AuthContext)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Re-throw so individual callers can handle specific errors
    return Promise.reject(error);
  }
);

export default api;
