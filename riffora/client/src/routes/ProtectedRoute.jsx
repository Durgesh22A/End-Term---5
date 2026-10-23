import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute wraps pages that require login.
 * If user isn't authenticated → redirect to /login.
 * If still loading the session → show nothing (prevents flash).
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null; // Session check in progress

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
