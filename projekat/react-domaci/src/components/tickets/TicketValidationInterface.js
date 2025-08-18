import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import InputField from "../common/InputField";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import QRCodeScanner from "./QRCodeScanner";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api";

const TicketValidationInterface = () => {
  const { user, isAdmin } = useAuth();
  const [validationMode, setValidationMode] = useState("single"); // single, bulk, scanner
  const [ticketNumber, setTicketNumber] = useState("");
  const [bulkTickets, setBulkTickets] = useState("");
  const [validationResults, setValidationResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [events, setEvents] = useState([]);
  const [validationStats, setValidationStats] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  useEffect(() => {
    if (isAdmin()) {
      loadEvents();
    }
  }, []);

  const loadEvents = async () => {
    try {
      const response = await apiService.getEvents();
      if (response.success) {
        const eventsData = response.data?.data || response.data || [];
        setEvents(Array.isArray(eventsData) ? eventsData : []);
      }
    } catch (error) {
      console.error("Error loading events:", error);
      setEvents([]);
    }
  };

  const validateSingleTicket = async () => {
    if (!ticketNumber.trim()) {
      setError("Unesite broj karte");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiService.validateTicket(ticketNumber);

      const result = {
        ticket_number: ticketNumber,
        valid: response.valid,
        message: response.message,
        ticket: response.data,
        validation_details: response.validation_details,
        timestamp: new Date().toISOString(),
      };

      setValidationResults([result]);
      setTicketNumber("");

      // Auto-mark as used if valid and admin
      if (response.valid && isAdmin() && response.data) {
        const shouldMarkUsed = window.confirm(
          "Karta je validna. Da li želite da je označite kao iskorišćenu?"
        );

        if (shouldMarkUsed) {
          await markTicketAsUsed(response.data.id, result);
        }
      }
    } catch (err) {
      setError(err.message || "Greška pri validaciji karte");
      setValidationResults([
        {
          ticket_number: ticketNumber,
          valid: false,
          message: err.message || "Greška pri validaciji",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const validateBulkTickets = async () => {
    const tickets = bulkTickets
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t);

    if (tickets.length === 0) {
      setError("Unesite brojeve karata");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiService.validateBulkTickets(tickets);

      if (response.success) {
        const results = response.data.data.map((result) => ({
          ...result,
          timestamp: new Date().toISOString(),
        }));

        setValidationResults(results);
        setBulkTickets("");
      }
    } catch (err) {
      setError(err.message || "Greška pri masovnoj validaciji");
    } finally {
      setLoading(false);
    }
  };

  const markTicketAsUsed = async (ticketId, validationResult) => {
    try {
      const response = await apiService.markTicketAsUsed(ticketId);

      if (response.success) {
        // Update validation result
        const updatedResults = validationResults.map((result) =>
          result.ticket_number === validationResult.ticket_number
            ? {
                ...result,
                ticket: { ...result.ticket, status: "used" },
                marked_used: true,
              }
            : result
        );
        setValidationResults(updatedResults);
      }
    } catch (error) {
      alert("Greška pri označavanju karte: " + error.message);
    }
  };

  const loadValidationStats = async () => {
    if (!selectedEvent) {
      setError("Izaberite događaj");
      return;
    }

    try {
      const response = await apiService.getEventValidationStats(selectedEvent);

      if (response.success) {
        setValidationStats(response.data);
        setShowStatsModal(true);
      }
    } catch (err) {
      setError(err.message || "Greška pri učitavanju statistika");
    }
  };

  const startQRScanner = () => {
    setShowQRScanner(true);
  };

  const handleQRScan = async (qrData) => {
    try {
      const response = await apiService.validateQRCode(qrData);

      const result = {
        ticket_number: response.qr_data?.ticket_number || "Unknown",
        valid: response.valid,
        message: response.message,
        ticket: response.data,
        timestamp: new Date().toISOString(),
        scanned: true,
      };

      setValidationResults((prev) => [result, ...prev]);

      if (response.valid && response.data) {
        const shouldMarkUsed = window.confirm(
          "QR kod je valjan. Da li želite da označite kartu kao iskorišćenu?"
        );

        if (shouldMarkUsed) {
          await markTicketAsUsed(response.data.id, result);
        }
      }
    } catch (err) {
      setError("Greška pri validaciji QR koda: " + err.message);
    }
  };

  const clearResults = () => {
    setValidationResults([]);
    setError("");
  };

  const exportResults = () => {
    if (validationResults.length === 0) return;

    const csvContent = [
      ["Broj karte", "Validna", "Poruka", "Vreme validacije", "Način"].join(
        ","
      ),
      ...validationResults.map((result) =>
        [
          result.ticket_number,
          result.valid ? "Da" : "Ne",
          `"${result.message}"`,
          new Date(result.timestamp).toLocaleString("sr-RS"),
          result.scanned ? "QR skener" : "Manuelno",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `validation-results-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getValidationIcon = (result) => {
    if (result.scanned) return "📱";
    if (result.valid) return "✅";
    if (result.message?.includes("used")) return "🎫";
    if (result.message?.includes("cancelled")) return "❌";
    return "⚠️";
  };

  const getValidationColor = (result) => {
    if (result.valid) return "#28a745";
    if (result.message?.includes("used")) return "#6c757d";
    return "#dc3545";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("sr-RS");
  };

  if (!isAdmin()) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <h3>Nemate dozvolu</h3>
        <p>Ova funkcionalnost je dostupna samo administratorima.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1>Validacija karata</h1>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Button
            variant="outline"
            onClick={loadValidationStats}
            disabled={!selectedEvent}
          >
            📊 Statistike
          </Button>
          <Button
            variant="outline"
            onClick={exportResults}
            disabled={validationResults.length === 0}
          >
            📥 Izvezi rezultate
          </Button>
        </div>
      </div>

      {/* Validation mode selector */}
      <div
        style={{
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          marginBottom: "2rem",
        }}
      >
        <h3>Način validacije</h3>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <Button
            variant={validationMode === "single" ? "primary" : "outline"}
            onClick={() => setValidationMode("single")}
          >
            Pojedinačna
          </Button>
          <Button
            variant={validationMode === "bulk" ? "primary" : "outline"}
            onClick={() => setValidationMode("bulk")}
          >
            Masovna
          </Button>
          <Button
            variant={validationMode === "scanner" ? "primary" : "outline"}
            onClick={() => setValidationMode("scanner")}
          >
            QR skener
          </Button>
        </div>

        {/* Event selector for stats */}
        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "500",
            }}
          >
            Događaj (za statistike):
          </label>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            style={{
              width: "300px",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          >
            <option value="">Izaberite događaj</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} -{" "}
                {new Date(event.start_date).toLocaleDateString("sr-RS")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div
          style={{
            color: "#dc3545",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            padding: "1rem",
            marginBottom: "2rem",
          }}
        >
          {error}
          <Button
            variant="outline"
            size="small"
            onClick={() => setError("")}
            style={{ marginLeft: "1rem" }}
          >
            Zatvori
          </Button>
        </div>
      )}

      {/* Validation interface */}
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          marginBottom: "2rem",
        }}
      >
        {validationMode === "single" && (
          <div>
            <h3>Pojedinačna validacija</h3>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              <InputField
                placeholder="Unesite broj karte (npr. TKT-ABC12345)"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === "Enter" && validateSingleTicket()}
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

        {validationMode === "bulk" && (
          <div>
            <h3>Masovna validacija</h3>
            <InputField
              type="textarea"
              placeholder="Unesite brojeve karata (jedan po liniji)"
              value={bulkTickets}
              onChange={(e) => setBulkTickets(e.target.value)}
              rows={8}
              style={{ marginBottom: "1rem" }}
            />
            <Button
              onClick={validateBulkTickets}
              disabled={loading || !bulkTickets.trim()}
            >
              {loading ? "Validacija..." : "Validiraj sve"}
            </Button>
          </div>
        )}

        {validationMode === "scanner" && (
          <div style={{ textAlign: "center" }}>
            <h3>QR kod skener</h3>
            <div
              style={{
                backgroundColor: "#f8f9fa",
                border: "2px dashed #dee2e6",
                borderRadius: "8px",
                padding: "3rem",
                marginBottom: "2rem",
              }}
            >
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📱</div>
              <p>Kliknite da aktivirate kameru za skeniranje QR kodova</p>
              <Button onClick={startQRScanner}>Aktiviraj QR skener</Button>
            </div>

            <div
              style={{
                backgroundColor: "#d1ecf1",
                border: "1px solid #bee5eb",
                borderRadius: "4px",
                padding: "1rem",
                fontSize: "0.875rem",
              }}
            >
              <strong>Napomena:</strong> QR skener koristi kameru vašeg uređaja
              za skeniranje QR kodova na kartama. Dozvolite pristup kameri kada
              se pojavi zahtev.
            </div>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <LoadingSpinner />
          <p>Validacija u toku...</p>
        </div>
      )}

      {/* Validation results */}
      {validationResults.length > 0 && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 1.5rem",
              backgroundColor: "#f8f9fa",
              borderBottom: "1px solid #dee2e6",
            }}
          >
            <h3 style={{ margin: 0 }}>Rezultati validacije</h3>
            <Button variant="outline" size="small" onClick={clearResults}>
              Obriši rezultate
            </Button>
          </div>

          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {validationResults.map((result, index) => (
              <ValidationResultCard
                key={index}
                result={result}
                onMarkAsUsed={markTicketAsUsed}
                isAdmin={isAdmin()}
                getValidationIcon={getValidationIcon}
                getValidationColor={getValidationColor}
                formatDate={formatDate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Validation stats modal */}
      <Modal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        title="Statistike validacije"
        size="large"
      >
        {validationStats && (
          <ValidationStatsModal
            stats={validationStats}
            onClose={() => setShowStatsModal(false)}
          />
        )}
      </Modal>

      {/* QR Code Scanner Modal */}
      <QRCodeScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
      />
    </div>
  );
};

// Validation result card component
const ValidationResultCard = ({
  result,
  onMarkAsUsed,
  isAdmin,
  getValidationIcon,
  getValidationColor,
  formatDate,
}) => (
  <div
    style={{
      padding: "1rem 1.5rem",
      borderBottom: "1px solid #dee2e6",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <div style={{ flex: 1 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "0.5rem",
        }}
      >
        <span style={{ fontSize: "1.5rem" }}>{getValidationIcon(result)}</span>
        <span
          style={{
            fontFamily: "monospace",
            fontWeight: "bold",
            fontSize: "1.1rem",
          }}
        >
          {result.ticket_number}
        </span>
        <span
          style={{
            color: getValidationColor(result),
            fontWeight: "bold",
          }}
        >
          {result.message}
        </span>
        {result.scanned && (
          <span
            style={{
              backgroundColor: "#007bff",
              color: "white",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.75rem",
            }}
          >
            QR skenirano
          </span>
        )}
      </div>

      {result.ticket && (
        <div
          style={{
            fontSize: "0.875rem",
            color: "#6c757d",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0.5rem",
          }}
        >
          <div>Događaj: {result.ticket.event?.name}</div>
          <div>Vlasnik: {result.ticket.user?.name}</div>
          <div>Status: {result.ticket.status}</div>
          <div>Cena: {result.ticket.price} RSD</div>
        </div>
      )}

      <div
        style={{ fontSize: "0.75rem", color: "#6c757d", marginTop: "0.5rem" }}
      >
        Validacija: {formatDate(result.timestamp)}
      </div>
    </div>

    <div style={{ display: "flex", gap: "0.5rem" }}>
      {result.valid &&
        result.ticket &&
        result.ticket.status === "active" &&
        isAdmin &&
        !result.marked_used && (
          <Button
            size="small"
            onClick={() => onMarkAsUsed(result.ticket.id, result)}
          >
            Označi kao iskorišćenu
          </Button>
        )}

      {result.marked_used && (
        <span
          style={{
            padding: "0.25rem 0.5rem",
            backgroundColor: "#28a745",
            color: "white",
            borderRadius: "4px",
            fontSize: "0.75rem",
          }}
        >
          Označeno
        </span>
      )}
    </div>
  </div>
);

// Validation stats modal component
const ValidationStatsModal = ({ stats, onClose }) => (
  <div style={{ padding: "1rem" }}>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "1rem",
        marginBottom: "2rem",
      }}
    >
      <div
        style={{
          backgroundColor: "#f8f9fa",
          padding: "1rem",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#007bff" }}>
          {stats.total_tickets}
        </div>
        <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
          Ukupno karata
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#d4edda",
          padding: "1rem",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#28a745" }}>
          {stats.used_tickets}
        </div>
        <div style={{ fontSize: "0.875rem", color: "#155724" }}>
          Iskorišćene
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#d1ecf1",
          padding: "1rem",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#0c5460" }}>
          {stats.active_tickets}
        </div>
        <div style={{ fontSize: "0.875rem", color: "#0c5460" }}>Aktivne</div>
      </div>

      <div
        style={{
          backgroundColor: "#f8d7da",
          padding: "1rem",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#dc3545" }}>
          {Math.round(stats.validation_rate)}%
        </div>
        <div style={{ fontSize: "0.875rem", color: "#721c24" }}>
          Stopa validacije
        </div>
      </div>
    </div>

    {stats.recent_validations.length > 0 && (
      <div>
        <h4>Poslednje validacije</h4>
        <div
          style={{
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {stats.recent_validations.map((validation, index) => (
            <div
              key={index}
              style={{
                padding: "0.75rem 1rem",
                borderBottom:
                  index < stats.recent_validations.length - 1
                    ? "1px solid #dee2e6"
                    : "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: "bold" }}>
                  {validation.ticket_number}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                  {validation.user_name}
                </div>
              </div>
              <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                {validation.time_ago}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <Button onClick={onClose}>Zatvori</Button>
    </div>
  </div>
);

export default TicketValidationInterface;
