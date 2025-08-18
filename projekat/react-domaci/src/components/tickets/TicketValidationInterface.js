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
  const [events, setEvents] = useState([]); // Inicijalizovano kao prazan niz
  const [validationStats, setValidationStats] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false); // Dodato za loading state

  useEffect(() => {
    if (isAdmin()) {
      loadEvents();
    }
  }, []);

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      console.log("Loading events...");
      const response = await apiService.getEvents();
      console.log("Events API response:", response);

      if (response && response.success) {
        let eventsData = [];

        // Detaljnije provere strukture odgovora
        if (response.data?.data && Array.isArray(response.data.data)) {
          eventsData = response.data.data;
        } else if (response.data && Array.isArray(response.data)) {
          eventsData = response.data;
        } else if (Array.isArray(response)) {
          eventsData = response;
        }

        console.log("Processed events data:", eventsData);
        setEvents(eventsData);
      } else {
        console.warn("Events API returned invalid response:", response);
        setEvents([]);
      }
    } catch (error) {
      console.error("Error loading events:", error);
      setError(
        "Greška pri učitavanju događaja: " +
          (error.message || "Nepoznata greška")
      );
      setEvents([]);
    } finally {
      setEventsLoading(false);
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
        valid: response.valid || false,
        message: response.message || "Nepoznata greška",
        ticket: response.data || null,
        validation_details: response.validation_details || null,
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
      const errorMessage = err.message || "Greška pri validaciji karte";
      setError(errorMessage);
      setValidationResults([
        {
          ticket_number: ticketNumber,
          valid: false,
          message: errorMessage,
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

    if (tickets.length > 50) {
      setError("Maksimalno 50 karata po zahtev");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiService.validateBulkTickets(tickets);

      if (response && response.success && response.data) {
        const resultsData = response.data.data || response.data || [];
        const results = Array.isArray(resultsData)
          ? resultsData.map((result) => ({
              ...result,
              timestamp: new Date().toISOString(),
            }))
          : [];

        setValidationResults(results);
        setBulkTickets("");
      } else {
        throw new Error(response?.message || "Neispravni odgovor servera");
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

      if (response && response.success) {
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
      } else {
        throw new Error(response?.message || "Greška pri označavanju karte");
      }
    } catch (error) {
      alert(
        "Greška pri označavanju karte: " + (error.message || "Nepoznata greška")
      );
    }
  };

  const loadValidationStats = async () => {
    if (!selectedEvent) {
      setError("Izaberite događaj");
      return;
    }

    try {
      const response = await apiService.getEventValidationStats(selectedEvent);

      if (response && response.success) {
        setValidationStats(response.data);
        setShowStatsModal(true);
      } else {
        throw new Error(
          response?.message || "Greška pri učitavanju statistika"
        );
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
      const parsedData = JSON.parse(qrData);

      // Check if this is demo data (starts with TKT-DEMO-)
      if (
        parsedData.ticket_number &&
        parsedData.ticket_number.startsWith("TKT-DEMO-")
      ) {
        let demoResult;

        switch (parsedData.demo_type) {
          case "valid":
            demoResult = {
              ticket_number: parsedData.ticket_number,
              valid: true,
              message: "Demo karta je validna ✅",
              ticket: {
                id: 999,
                ticket_number: parsedData.ticket_number,
                status: "active",
                price: 2500,
                event: {
                  id: parsedData.event_id,
                  name: parsedData.event_name,
                  location: parsedData.location,
                  start_date: parsedData.event_date,
                },
                user: {
                  id: parsedData.user_id,
                  name: parsedData.user_name,
                  email: "demo@example.com",
                },
              },
              timestamp: new Date().toISOString(),
              scanned: true,
              demo: true,
            };
            break;

          case "used":
            demoResult = {
              ticket_number: parsedData.ticket_number,
              valid: false,
              message: "Demo karta je već iskorišćena 🎫",
              ticket: {
                id: 998,
                ticket_number: parsedData.ticket_number,
                status: "used",
                price: 2500,
                event: {
                  id: parsedData.event_id,
                  name: parsedData.event_name,
                  location: parsedData.location || "Demo Arena, Beograd",
                },
                user: {
                  id: parsedData.user_id,
                  name: parsedData.user_name,
                  email: "demo@example.com",
                },
              },
              timestamp: new Date().toISOString(),
              scanned: true,
              demo: true,
            };
            break;

          case "invalid":
            demoResult = {
              ticket_number: parsedData.ticket_number,
              valid: false,
              message: "Demo karta ne postoji u sistemu ❌",
              ticket: null,
              timestamp: new Date().toISOString(),
              scanned: true,
              demo: true,
            };
            break;

          case "cancelled":
            demoResult = {
              ticket_number: parsedData.ticket_number,
              valid: false,
              message: "Demo karta je otkazana 🚫",
              ticket: {
                id: 997,
                ticket_number: parsedData.ticket_number,
                status: "cancelled",
                price: 2500,
                event: {
                  id: parsedData.event_id,
                  name: parsedData.event_name,
                  location: parsedData.location || "Demo Arena, Beograd",
                },
                user: {
                  id: parsedData.user_id,
                  name: parsedData.user_name,
                  email: "demo@example.com",
                },
              },
              timestamp: new Date().toISOString(),
              scanned: true,
              demo: true,
            };
            break;

          case "expired":
            demoResult = {
              ticket_number: parsedData.ticket_number,
              valid: false,
              message: "Demo događaj je završen ⏰",
              ticket: {
                id: 996,
                ticket_number: parsedData.ticket_number,
                status: "active",
                price: 2500,
                event: {
                  id: parsedData.event_id,
                  name: parsedData.event_name,
                  location: parsedData.location || "Demo Arena, Beograd",
                  start_date: parsedData.event_date,
                },
                user: {
                  id: parsedData.user_id,
                  name: parsedData.user_name,
                  email: "demo@example.com",
                },
              },
              timestamp: new Date().toISOString(),
              scanned: true,
              demo: true,
            };
            break;

          default:
            demoResult = {
              ticket_number: parsedData.ticket_number,
              valid: true,
              message: "Demo karta je validna ✅",
              ticket: null,
              timestamp: new Date().toISOString(),
              scanned: true,
              demo: true,
            };
        }

        setValidationResults((prev) => [demoResult, ...prev]);

        // Only show confirmation for valid demo tickets
        if (
          demoResult.valid &&
          demoResult.ticket &&
          demoResult.ticket.status === "active"
        ) {
          const shouldMarkUsed = window.confirm(
            "Demo QR kod je valjan. Da li želite da označite demo kartu kao iskorišćenu?"
          );

          if (shouldMarkUsed) {
            // Simulate marking as used for demo
            setValidationResults((prev) =>
              prev.map((result) =>
                result.ticket_number === demoResult.ticket_number
                  ? {
                      ...result,
                      ticket: { ...result.ticket, status: "used" },
                      marked_used: true,
                      message: "Demo karta je označena kao iskorišćena ✅",
                    }
                  : result
              )
            );
          }
        }

        return; // Exit early for demo data
      }

      // For non-demo data, proceed with normal API call
      const response = await apiService.validateQRCode(qrData);

      const result = {
        ticket_number: response.qr_data?.ticket_number || "Unknown",
        valid: response.valid || false,
        message: response.message || "Nepoznata greška",
        ticket: response.data || null,
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
      setError(
        "Greška pri validaciji QR koda: " + (err.message || "Nepoznata greška")
      );
    }
  };

  const clearResults = () => {
    setValidationResults([]);
    setError("");
  };

  const exportResults = () => {
    if (!Array.isArray(validationResults) || validationResults.length === 0) {
      setError("Nema rezultata za izvoz");
      return;
    }

    try {
      const csvContent = [
        ["Broj karte", "Validna", "Poruka", "Vreme validacije", "Način"].join(
          ","
        ),
        ...validationResults.map((result) =>
          [
            result.ticket_number || "N/A",
            result.valid ? "Da" : "Ne",
            `"${(result.message || "").replace(/"/g, '""')}"`,
            new Date(result.timestamp).toLocaleString("sr-RS"),
            result.scanned ? "QR skener" : "Manuelno",
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
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
    } catch (error) {
      setError("Greška pri izvozu rezultata: " + error.message);
    }
  };

  const getValidationIcon = (result) => {
    if (!result) return "⚠️";
    if (result.scanned) return "📱";
    if (result.valid) return "✅";
    if (result.message?.includes("used")) return "🎫";
    if (result.message?.includes("cancelled")) return "❌";
    return "⚠️";
  };

  const getValidationColor = (result) => {
    if (!result) return "#dc3545";
    if (result.valid) return "#28a745";
    if (result.message?.includes("used")) return "#6c757d";
    return "#dc3545";
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString("sr-RS");
    } catch (error) {
      return "Neispravni datum";
    }
  };

  // Dodana funkcija za retry učitavanja događaja
  const retryLoadEvents = () => {
    loadEvents();
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
            disabled={
              !Array.isArray(validationResults) ||
              validationResults.length === 0
            }
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

          {eventsLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <LoadingSpinner size="small" />
              <span>Učitavanje događaja...</span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
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
                {Array.isArray(events) && events.length > 0 ? (
                  events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name} -{" "}
                      {event.start_date
                        ? new Date(event.start_date).toLocaleDateString("sr-RS")
                        : "Nepoznat datum"}
                    </option>
                  ))
                ) : (
                  <option disabled>
                    {events.length === 0
                      ? "Nema dostupnih događaja"
                      : "Greška pri učitavanju"}
                  </option>
                )}
              </select>

              {!eventsLoading && events.length === 0 && (
                <Button
                  variant="outline"
                  size="small"
                  onClick={retryLoadEvents}
                >
                  🔄 Ponovi
                </Button>
              )}
            </div>
          )}
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <Button variant="outline" size="small" onClick={() => setError("")}>
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
                onKeyPress={(e) =>
                  e.key === "Enter" && !loading && validateSingleTicket()
                }
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
              placeholder="Unesite brojeve karata (jedan po liniji, maksimalno 50)"
              value={bulkTickets}
              onChange={(e) => setBulkTickets(e.target.value)}
              rows={8}
              style={{ marginBottom: "1rem" }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Button
                onClick={validateBulkTickets}
                disabled={loading || !bulkTickets.trim()}
              >
                {loading ? "Validacija..." : "Validiraj sve"}
              </Button>
              <span style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                {bulkTickets.split("\n").filter((t) => t.trim()).length} karata
              </span>
            </div>
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
      {Array.isArray(validationResults) && validationResults.length > 0 && (
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
            <h3 style={{ margin: 0 }}>
              Rezultati validacije ({validationResults.length})
            </h3>
            <Button variant="outline" size="small" onClick={clearResults}>
              Obriši rezultate
            </Button>
          </div>

          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {validationResults.map((result, index) => (
              <ValidationResultCard
                key={`${result.ticket_number}-${index}`}
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

// Validation result card component sa dodatnim proverama
const ValidationResultCard = ({
  result,
  onMarkAsUsed,
  isAdmin,
  getValidationIcon,
  getValidationColor,
  formatDate,
}) => {
  if (!result) {
    return (
      <div style={{ padding: "1rem", color: "#dc3545" }}>
        Greška: Neispravni podaci rezultata
      </div>
    );
  }

  return (
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
          <span style={{ fontSize: "1.5rem" }}>
            {getValidationIcon(result)}
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: "bold",
              fontSize: "1.1rem",
            }}
          >
            {result.ticket_number || "N/A"}
          </span>
          <span
            style={{
              color: getValidationColor(result),
              fontWeight: "bold",
            }}
          >
            {result.message || "Nepoznata greška"}
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
            <div>Događaj: {result.ticket.event?.name || "N/A"}</div>
            <div>Vlasnik: {result.ticket.user?.name || "N/A"}</div>
            <div>Status: {result.ticket.status || "N/A"}</div>
            <div>Cena: {result.ticket.price || "N/A"} RSD</div>
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
};

// Validation stats modal component sa dodatnim proverama
const ValidationStatsModal = ({ stats, onClose }) => {
  if (!stats) {
    return (
      <div style={{ padding: "1rem", textAlign: "center" }}>
        <p>Nema dostupnih statistika</p>
        <Button onClick={onClose}>Zatvori</Button>
      </div>
    );
  }

  return (
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
          <div
            style={{ fontSize: "2rem", fontWeight: "bold", color: "#007bff" }}
          >
            {stats.total_tickets || 0}
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
          <div
            style={{ fontSize: "2rem", fontWeight: "bold", color: "#28a745" }}
          >
            {stats.used_tickets || 0}
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
          <div
            style={{ fontSize: "2rem", fontWeight: "bold", color: "#0c5460" }}
          >
            {stats.active_tickets || 0}
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
          <div
            style={{ fontSize: "2rem", fontWeight: "bold", color: "#dc3545" }}
          >
            {Math.round(stats.validation_rate || 0)}%
          </div>
          <div style={{ fontSize: "0.875rem", color: "#721c24" }}>
            Stopa validacije
          </div>
        </div>
      </div>

      {Array.isArray(stats.recent_validations) &&
        stats.recent_validations.length > 0 && (
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
                      {validation.ticket_number || "N/A"}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                      {validation.user_name || "N/A"}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                    {validation.time_ago || "N/A"}
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
};

export default TicketValidationInterface;
