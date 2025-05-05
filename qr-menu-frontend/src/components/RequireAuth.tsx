import { Navigate, useLocation } from 'react-router-dom';
import authService from '../services/auth.service';

interface RequireAuthProps {
  children: JSX.Element;
  allowedRoles?: string[];
}

/**
 * A wrapper component that protects routes by checking if the user is authenticated
 * and has the required role before rendering the child components
 */
const RequireAuth = ({ children, allowedRoles = [] }: RequireAuthProps) => {
  const location = useLocation();
  const isAuthenticated = authService.isUserAuthenticated();
  const user = authService.getUser();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If no roles are specified, or if user has the required role, render children
  if (allowedRoles.length === 0 || (user && allowedRoles.includes(user.role))) {
    return children;
  }

  // If user doesn't have the required role, redirect to home page or access denied page
  return <Navigate to="/" replace />;
};

export default RequireAuth;
