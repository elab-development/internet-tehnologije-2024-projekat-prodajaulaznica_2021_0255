import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

const ProtectedRoute = ({
  children,
  requireAuth = true,
  requireRole = null,
  redirectTo = "/login",
  fallback = null,
}) => {
  const { isAuthenticated, hasRole, loading, isInitialized } = useAuth();
  const location = useLocation();

  // Show loading while auth is being initialized
  if (!isInitialized || loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated()) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requireRole && !hasRole(requireRole)) {
    return (
      fallback || (
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            color: "#666",
          }}
        >
          <h2>Nemate dozvolu</h2>
          <p>Nemate potrebne dozvole za pristup ovoj stranici.</p>
        </div>
      )
    );
  }

  // If user is authenticated but route is for guests only
  if (!requireAuth && isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
