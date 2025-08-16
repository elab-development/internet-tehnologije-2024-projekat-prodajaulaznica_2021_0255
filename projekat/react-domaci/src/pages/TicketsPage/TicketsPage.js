import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import UserTicketsDashboard from "../../components/tickets/UserTicketsDashboard";
import Button from "../../components/common/Button";

const TicketsPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated()) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem",
          maxWidth: "600px",
          margin: "0 auto",
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎫</div>
        <h2 style={{ marginBottom: "1rem", color: "#333" }}>
          Prijavite se za pristup kartama
        </h2>
        <p style={{ marginBottom: "2rem", color: "#666", lineHeight: "1.6" }}>
          Da biste videli svoje karte, upravljali njima i pristupili QR
          kodovima, morate biti prijavljeni na svoj nalog.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Button onClick={() => navigate("/login")}>Prijavite se</Button>
          <Button variant="outline" onClick={() => navigate("/register")}>
            Registrujte se
          </Button>
        </div>
      </div>
    );
  }

  return <UserTicketsDashboard />;
};

export default TicketsPage;
