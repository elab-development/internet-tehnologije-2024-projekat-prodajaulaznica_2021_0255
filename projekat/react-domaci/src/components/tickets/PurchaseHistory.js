import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import Modal from "../common/Modal";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api";

const PurchaseHistory = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMyTickets();

      if (response.success) {
        setTickets(response.data || []);
      }
    } catch (err) {
      setError(err.message || "Greška pri učitavanju karata");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTicket = async (ticketId) => {
    if (!window.confirm("Da li ste sigurni da želite da otkažete ovu kartu?")) {
      return;
    }

    try {
      const response = await apiService.cancelTicket(ticketId);

      if (response.success) {
        loadTickets(); // Refresh the list
        alert("Karta je uspešno otkazana");
      }
    } catch (err) {
      alert("Greška pri otkazivanju karte: " + err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("sr-RS", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("sr-RS").format(price);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "#28a745";
      case "used":
        return "#6c757d";
      case "cancelled":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "Aktivna";
      case "used":
        return "Iskorišćena";
      case "cancelled":
        return "Otkazana";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        Učitavanje vaših karata...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div style={{ color: "#dc3545", marginBottom: "1rem" }}>{error}</div>
        <Button onClick={loadTickets}>Pokušaj ponovo</Button>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h2>Moje karte</h2>
        <Button variant="outline" onClick={loadTickets}>
          Osveži
        </Button>
      </div>

      {tickets.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
          }}
        >
          <h3>Nemate kupljenih karata</h3>
          <p>Kada kupite karte, one će se pojaviti ovde.</p>
          <Button onClick={() => (window.location.href = "/events")}>
            Pogledaj događaje
          </Button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              style={{
                backgroundColor: "white",
                border: "1px solid #dee2e6",
                borderRadius: "8px",
                padding: "1.5rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "1rem",
                  alignItems: "start",
                }}
              >
                <div>
                  <h4 style={{ margin: "0 0 0.5rem 0" }}>
                    {ticket.event?.name}
                  </h4>

                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "#6c757d",
                      marginBottom: "1rem",
                    }}
                  >
                    <div>📅 {formatDate(ticket.event?.start_date)}</div>
                    <div>📍 {ticket.event?.location}</div>
                    <div>🎫 {ticket.ticket_number}</div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        backgroundColor: getStatusColor(ticket.status),
                        color: "white",
                        borderRadius: "4px",
                        fontSize: "0.875rem",
                      }}
                    >
                      {getStatusText(ticket.status)}
                    </span>

                    <span style={{ fontWeight: "bold" }}>
                      {formatPrice(ticket.price)} RSD
                    </span>

                    {ticket.discount_percentage > 0 && (
                      <span
                        style={{
                          color: "#28a745",
                          fontSize: "0.875rem",
                        }}
                      >
                        Popust {ticket.discount_percentage}%
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <Button
                    size="small"
                    variant="outline"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    Detalji
                  </Button>

                  {ticket.status === "active" &&
                    new Date(ticket.event?.start_date) > new Date() && (
                      <Button
                        size="small"
                        variant="danger"
                        onClick={() => handleCancelTicket(ticket.id)}
                      >
                        Otkaži
                      </Button>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket details modal */}
      <Modal
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title="Detalji karte"
        size="medium"
      >
        {selectedTicket && (
          <TicketDetails
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
          />
        )}
      </Modal>
    </div>
  );
};

// Ticket details component
const TicketDetails = ({ ticket, onClose }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("sr-RS", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("sr-RS").format(price);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <div
        style={{
          textAlign: "center",
          marginBottom: "2rem",
          padding: "1rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            fontSize: "2rem",
            fontFamily: "monospace",
            fontWeight: "bold",
            marginBottom: "0.5rem",
          }}
        >
          {ticket.ticket_number}
        </div>
        <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
          QR kod: {ticket.qr_code}
        </div>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h4>Informacije o događaju</h4>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <div>
            <strong>Naziv:</strong> {ticket.event?.name}
          </div>
          <div>
            <strong>Datum:</strong> {formatDate(ticket.event?.start_date)}
          </div>
          <div>
            <strong>Lokacija:</strong> {ticket.event?.location}
          </div>
          <div>
            <strong>Kategorija:</strong> {ticket.event?.category?.name}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h4>Informacije o karti</h4>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <div>
            <strong>Status:</strong> {ticket.status}
          </div>
          <div>
            <strong>Cena:</strong> {formatPrice(ticket.price)} RSD
          </div>
          {ticket.discount_percentage > 0 && (
            <div>
              <strong>Popust:</strong> {ticket.discount_percentage}%
            </div>
          )}
          <div>
            <strong>Datum kupovine:</strong> {formatDate(ticket.purchase_date)}
          </div>
          {ticket.used_at && (
            <div>
              <strong>Datum korišćenja:</strong> {formatDate(ticket.used_at)}
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <Button onClick={onClose}>Zatvori</Button>
      </div>
    </div>
  );
};

export default PurchaseHistory;
