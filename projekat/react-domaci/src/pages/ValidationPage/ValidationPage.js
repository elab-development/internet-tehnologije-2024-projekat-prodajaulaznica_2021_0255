import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import TicketValidationInterface from "../../components/tickets/TicketValidationInterface";
import Button from "../../components/common/Button";

const ValidationPage = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!isAdmin()) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <h2>Nemate dozvolu</h2>
        <p style={{ marginBottom: "2rem", color: "#666" }}>
          Validacija karata je dostupna samo administratorima.
        </p>
        <Button onClick={() => navigate("/")}>Vrati se na početnu</Button>
      </div>
    );
  }

  return <TicketValidationInterface />;
};

export default ValidationPage;
