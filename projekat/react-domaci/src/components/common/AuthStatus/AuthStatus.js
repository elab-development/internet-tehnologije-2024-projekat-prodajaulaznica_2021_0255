import React from "react";
import { useAuth } from "../../../context/AuthContext";
import Button from "../Button";

const AuthStatus = () => {
  const { user, isAuthenticated, logout, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated()) {
    return (
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Button
          variant="outline"
          size="small"
          onClick={() => (window.location.href = "/login")}
        >
          Prijava
        </Button>
        <Button
          size="small"
          onClick={() => (window.location.href = "/register")}
        >
          Registracija
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <span style={{ color: "#666" }}>Dobrodošli, {user?.name}</span>
      <Button
        variant="outline"
        size="small"
        onClick={() => (window.location.href = "/profile")}
      >
        Profil
      </Button>
      <Button variant="outline" size="small" onClick={logout}>
        Odjava
      </Button>
    </div>
  );
};

export default AuthStatus;
