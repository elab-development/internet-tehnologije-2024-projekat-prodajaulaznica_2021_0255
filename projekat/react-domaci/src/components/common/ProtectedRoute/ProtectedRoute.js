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
  const { user, isAuthenticated, hasRole, isAdmin, loading, isInitialized } =
    useAuth();
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
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ fontSize: "2rem" }}>🎫</div>
        <div>Proverava se autentifikacija...</div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated()) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requireRole) {
    let hasRequiredRole = false;

    // Handle admin role specifically
    if (requireRole === "admin") {
      hasRequiredRole = isAdmin();
    } else {
      // For other roles, use hasRole function
      hasRequiredRole = hasRole(requireRole);
    }

    if (!hasRequiredRole) {
      return (
        fallback || (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              backgroundColor: "#fee",
              border: "1px solid #fcc",
              borderRadius: "8px",
              margin: "2rem",
            }}
          >
            <h2>
              {requireRole === "admin"
                ? "Admin pristup potreban"
                : "Nemate dozvolu"}
            </h2>
            <p>
              {requireRole === "admin"
                ? "Ova stranica je dostupna samo administratorima."
                : "Nemate potrebne dozvole za pristup ovoj stranici."}
            </p>
            {user && (
              <div style={{ marginTop: "1rem", color: "#666" }}>
                <p>
                  Trenutno ste ulogovani kao: <strong>{user.name}</strong>
                </p>
                {requireRole === "admin" && !isAdmin() && (
                  <p style={{ fontSize: "0.9rem" }}>
                    Vaš nalog nema admin privilegije.
                  </p>
                )}
              </div>
            )}
            <div style={{ marginTop: "1.5rem" }}>
              <button
                onClick={() => window.history.back()}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Vrati se nazad
              </button>
            </div>
          </div>
        )
      );
    }
  }

  // If user is authenticated but route is for guests only
  if (!requireAuth && isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
