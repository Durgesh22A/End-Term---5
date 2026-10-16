import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

/**
 * AuthContext — global auth state shared across the app.
 *
 * WHY context over prop-drilling?
 *   Every component needs to know "is user logged in?" — passing it as props
 *   through every level (Navbar → Page → Card → Button) is messy.
 *   Context gives any component direct access without the chain.
 */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // True while checking session

  // Check if user has an existing session on app load
  const checkAuth = useCallback(async () => {
    try {
      const { data } = await authAPI.me();
      setUser(data.user);
    } catch {
      setUser(null); // 401 = no session, that's fine
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async (credentials) => {
    const { data } = await authAPI.login(credentials);
    setUser(data.user);
    return data.user;
  };

  const register = async (userData) => {
    const { data } = await authAPI.register(userData);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  const value = { user, loading, login, register, logout, isAuthenticated: !!user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook — so components import useAuth() instead of useContext(AuthContext)
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
