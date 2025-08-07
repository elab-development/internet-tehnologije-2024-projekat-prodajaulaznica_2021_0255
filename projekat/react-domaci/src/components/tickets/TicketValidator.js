import React, { useState } from "react";
import Button from "../common/Button";
import InputField from "../common/InputField";
import apiService from "../../services/api";

const TicketValidator = () => {
  const [ticketNumber, setTicketNumber] = useState("");
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkTickets, setBulkTickets] = useState("");

  const validateSingleTicket = async () => {
    if (!ticketNumber.trim()) return;

    setLoading(true);
    try {
      const response = await apiService.validateTicket(ticketNumber);
      setValidationResult({
        type: "single",
        data: response,
      });
    } catch (error) {
      setValidationResult({
        type: "single",
        data: {
          success: false,
          message: error.message || "Greška pri validaciji",
          valid: false,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const validateBulkTickets = async () => {
    const tickets = bulkTickets
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t);
    if (tickets.length === 0) return;

    setLoading(true);
    try {
      const response = await apiService.validateBulkTickets(tickets);
      setValidationResult({
        type: "bulk",
        data: response,
      });
    } catch (error) {
      setValidationResult({
        type: "bulk",
        data: {
          success: false,
          message: error.message || "Greška pri validaciji",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const markTicketAsUsed = async (ticketId) => {
    try {
      const response = await apiService.markTicketAsUsed(ticketId);
      if (response.success) {
        // Refresh validation result
        if (validationResult?.type === "single") {
          validateSingleTicket();
        }
      }
    } catch (error) {
      alert("Greška pri označavanju karte: " + error.message);
    }
  };

  const getStatusColor = (valid, status) => {
    if (valid) return "#28a745";
    if (status === "used") return "#6c757d";
    return "#dc3545";
  };

  const getStatusIcon = (valid, status) => {
    if (valid) return "✅";
    if (status === "used") return "🎫";
    return "❌";
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <h2>Validacija karata</h2>

      {/* Mode toggle */}
      <div style={{ marginBottom: "2rem" }}>
        <Button
          variant={!bulkMode ? "primary" : "outline"}
          onClick={() => setBulkMode(false)}
          style={{ marginRight: "1rem" }}
        >
          Pojedinačna validacija
        </Button>
        <Button
          variant={bulkMode ? "primary" : "outline"}
          onClick={() => setBulkMode(true)}
        >
          Masovna validacija
        </Button>
      </div>

      {/* Single ticket validation */}
      {!bulkMode && (
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <InputField
              placeholder="Unesite broj karte (npr. TKT-ABC12345)"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
              style={{ flex: 1 }}
            />
            <Button
              onClick={validateSingleTicket}
              disabled={loading || !ticketNumber.trim()}
            >
              {loading ? "Validacija..." : "Validiraj"}
            </Button>
          </div>
        </div>
      )}

      {/* Bulk ticket validation */}
      {bulkMode && (
        <div style={{ marginBottom: "2rem" }}>
          <InputField
            type="textarea"
            placeholder="Unesite brojeve karata (jedan po liniji)"
            value={bulkTickets}
            onChange={(e) => setBulkTickets(e.target.value)}
            rows={6}
          />
          <Button
            onClick={validateBulkTickets}
            disabled={loading || !bulkTickets.trim()}
            style={{ marginTop: "1rem" }}
          >
            {loading ? "Validacija..." : "Validiraj sve"}
          </Button>
        </div>
      )}

      {/* Validation results */}
      {validationResult && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "1.5rem",
            backgroundColor: "#f8f9fa",
          }}
        >
          <h3>Rezultat validacije</h3>

          {validationResult.type === "single" && (
            <SingleTicketResult
              result={validationResult.data}
              onMarkAsUsed={markTicketAsUsed}
            />
          )}

          {validationResult.type === "bulk" && (
            <BulkTicketResults result={validationResult.data} />
          )}
        </div>
      )}
    </div>
  );
};

// Single ticket result component
const SingleTicketResult = ({ result, onMarkAsUsed }) => {
  const getStatusColor = (valid) => (valid ? "#28a745" : "#dc3545");
  const getStatusIcon = (valid) => (valid ? "✅" : "❌");

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1rem",
          fontSize: "1.2rem",
        }}
      >
        <span style={{ fontSize: "2rem" }}>{getStatusIcon(result.valid)}</span>
        <span
          style={{ color: getStatusColor(result.valid), fontWeight: "bold" }}
        >
          {result.message}
        </span>
      </div>

      {result.valid && result.data && (
        <div
          style={{
            backgroundColor: "white",
            padding: "1rem",
            borderRadius: "4px",
            marginBottom: "1rem",
          }}
        >
          <h4>Detalji karte</h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div>
              <strong>Broj karte:</strong> {result.data.ticket_number}
            </div>
            <div>
              <strong>Događaj:</strong> {result.data.event?.name}
            </div>
            <div>
              <strong>Vlasnik:</strong> {result.data.user?.name}
            </div>
            <div>
              <strong>Cena:</strong> {result.data.price} RSD
            </div>
            <div>
              <strong>Status:</strong> {result.data.status}
            </div>
            <div>
              <strong>Datum kupovine:</strong>{" "}
              {new Date(result.data.purchase_date).toLocaleDateString("sr-RS")}
            </div>
          </div>

          {result.data.status === "active" && (
            <Button
              onClick={() => onMarkAsUsed(result.data.id)}
              style={{ marginTop: "1rem" }}
            >
              Označi kao iskorišćenu
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// Bulk ticket results component
const BulkTicketResults = ({ result }) => {
  if (!result.success) {
    return (
      <div style={{ color: "#dc3545" }}>
        <strong>Greška:</strong> {result.message}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <strong>Rezime:</strong> {result.data.summary.valid} validnih od{" "}
        {result.data.summary.total} karata
      </div>

      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        {result.data.data.map((ticket, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.5rem",
              borderBottom: "1px solid #eee",
              backgroundColor: ticket.valid ? "#d4edda" : "#f8d7da",
            }}
          >
            <span>{ticket.ticket_number}</span>
            <span
              style={{
                color: ticket.valid ? "#155724" : "#721c24",
                fontWeight: "bold",
              }}
            >
              {ticket.valid ? "✅" : "❌"} {ticket.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TicketValidator;
