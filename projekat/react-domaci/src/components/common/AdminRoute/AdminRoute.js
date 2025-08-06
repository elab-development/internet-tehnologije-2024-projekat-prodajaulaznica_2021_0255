import React from "react";
import ProtectedRoute from "../ProtectedRoute";

const AdminRoute = ({ children }) => {
  return (
    <ProtectedRoute
      requireAuth={true}
      requireRole="admin"
      fallback={
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
          <h2>Admin pristup potreban</h2>
          <p>Ova stranica je dostupna samo administratorima.</p>
        </div>
      }
    >
      {children}
    </ProtectedRoute>
  );
};

export default AdminRoute;
