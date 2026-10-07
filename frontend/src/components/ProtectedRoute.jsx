import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, getUserRole } from '../services/auth';

const ProtectedRoute = ({ children, allowedRoles }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/sign-in" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = getUserRole();
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
