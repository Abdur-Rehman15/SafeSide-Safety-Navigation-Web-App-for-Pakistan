import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';  // Correct import path

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>; // Or your custom loader
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <Outlet />;
}