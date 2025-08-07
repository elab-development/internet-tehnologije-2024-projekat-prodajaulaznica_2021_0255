import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import InputField from "../common/InputField";
import Modal from "../common/Modal";
import Pagination from "../common/Pagination";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api";

const UserTicketsDashboard = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    sortBy: "purchase_date",
    sortOrder: "desc",
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    used: 0,
    cancelled: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadTickets();
  }, [filters, currentPage]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiService.getMyTickets({
        ...filters,
        page: currentPage,
        per_page: 10,
      });

      if (response.success) {
        setTickets(response.data.tickets || []);
        setStats(response.data.stats || stats);
        setTotalPages(response.data.pagination?.last_page || 1);
      }
    } catch (err) {
      setError(err.message || "Greška pri učitavanju karata");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleCancelTicket = async (ticketId) => {
    if (!window.confirm("Da li ste sigurni da želite da otkažete ovu kartu?")) {
      return;
    }

    try {
      const response = await apiService.cancelTicket(ticketId);

      if (response.success) {
        loadTickets(); // Refresh the list
        setSelectedTicket(null);
        alert("Karta je uspešno otkazana");
      }
    } catch (err) {
      alert("Greška pri otkazivanju karte: " + err.message);
    }
  };

  const handleDownloadTicket = async (ticket) => {
    try {
      // This would typically generate a PDF or image of the ticket
      const ticketData = {
        ticket_number: ticket.ticket_number,
        event_name: ticket.event?.name,
        event_date: ticket.event?.start_date,
        location: ticket.event?.location,
        qr_code: ticket.qr_code,
        price: ticket.price,
      };

      // For demo purposes, we'll create a simple text representation
      const ticketText = `
TICKET MASTER - ELEKTRONSKA KARTA

Broj karte: ${ticketData.ticket_number}
Događaj: ${ticketData.event_name}
Datum: ${new Date(ticketData.event_date).toLocaleDateString("sr-RS")}
Vreme: ${new Date(ticketData.event_date).toLocaleTimeString("sr-RS", {
        hour: "2-digit",
        minute: "2-digit",
      })}
Lokacija: ${ticketData.location}
Cena: ${ticketData.price} RSD
QR kod: ${ticketData.qr_code}

Molimo sačuvajte ovu kartu za ulaz na događaj.
            `;

      const blob = new Blob([ticketText], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket-${ticket.ticket_number}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Greška pri preuzimanju karte: " + err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("sr-RS", {
      year: "numeric",
      month: "short",
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

  const canCancelTicket = (ticket) => {
    return (
      ticket.status === "active" &&
      new Date(ticket.event?.start_date) > new Date()
    );
  };

  const isEventStartingSoon = (ticket) => {
    const eventDate = new Date(ticket.event?.start_date);
    const now = new Date();
    const hoursDiff = (eventDate - now) / (1000 * 60 * 60);
    return hoursDiff <= 24 && hoursDiff > 0;
  };

  return (
    <div style={{ padding: "2rem" }}>
      {/* Header with stats */}
      <div style={{ marginBottom: "2rem" }}>
        <h1>Moje karte</h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1rem",
            marginTop: "1rem",
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
              {stats.total}
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
              {stats.active}
            </div>
            <div style={{ fontSize: "0.875rem", color: "#155724" }}>
              Aktivne karte
            </div>
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
              {stats.cancelled}
            </div>
            <div style={{ fontSize: "0.875rem", color: "#721c24" }}>
              Otkazane karte
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
              {stats.used}
            </div>
            <div style={{ fontSize: "0.875rem", color: "#0c5460" }}>
              Iskorišćene karte
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            alignItems: "end",
          }}
        >
          <InputField
            label="Pretraži"
            placeholder="Naziv događaja, lokacija..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <option value="all">Sve karte</option>
              <option value="active">Aktivne</option>
              <option value="used">Iskorišćene</option>
              <option value="cancelled">Otkazane</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Sortiraj po
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <option value="purchase_date">Datum kupovine</option>
              <option value="event_date">Datum događaja</option>
              <option value="price">Cena</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Redosled
            </label>
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange("sortOrder", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <option value="desc">Opadajući</option>
              <option value="asc">Rastući</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error message */}
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
            onClick={loadTickets}
            style={{ marginLeft: "1rem" }}
          >
            Pokušaj ponovo
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          Učitavanje karata...
        </div>
      )}

      {/* Tickets list */}
      {!loading && (
        <>
          {tickets.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <h3>Nema karata</h3>
              <p>
                {filters.status === "all"
                  ? "Nemate kupljenih karata."
                  : `Nemate karata sa statusom "${getStatusText(
                      filters.status
                    )}".`}
              </p>
              <Button onClick={() => (window.location.href = "/events")}>
                Pogledaj događaje
              </Button>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                overflow: "hidden",
              }}
            >
              {tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onViewDetails={() => setSelectedTicket(ticket)}
                  onCancel={() => handleCancelTicket(ticket.id)}
                  onDownload={() => handleDownloadTicket(ticket)}
                  canCancelTicket={canCancelTicket}
                  isEventStartingSoon={isEventStartingSoon}
                  formatDate={formatDate}
                  formatPrice={formatPrice}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      {/* Ticket details modal */}
      <Modal
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title="Detalji karte"
        size="large"
      >
        {selectedTicket && (
          <TicketDetailsModal
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
            onCancel={() => handleCancelTicket(selectedTicket.id)}
            onDownload={() => handleDownloadTicket(selectedTicket)}
            canCancelTicket={canCancelTicket}
            formatDate={formatDate}
            formatPrice={formatPrice}
            getStatusColor={getStatusColor}
            getStatusText={getStatusText}
          />
        )}
      </Modal>
    </div>
  );
};

// Individual ticket card component
const TicketCard = ({
  ticket,
  onViewDetails,
  onCancel,
  onDownload,
  canCancelTicket,
  isEventStartingSoon,
  formatDate,
  formatPrice,
  getStatusColor,
  getStatusText,
}) => (
  <div
    style={{
      padding: "1.5rem",
      borderBottom: "1px solid #dee2e6",
      position: "relative",
    }}
  >
    {isEventStartingSoon(ticket) && (
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          backgroundColor: "#ffc107",
          color: "#212529",
          padding: "0.25rem 0.5rem",
          borderRadius: "4px",
          fontSize: "0.75rem",
          fontWeight: "bold",
        }}
      >
        Uskoro počinje!
      </div>
    )}

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "1rem",
        alignItems: "start",
      }}
    >
      <div>
        <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem" }}>
          {ticket.event?.name}
        </h4>

        <div
          style={{
            fontSize: "0.875rem",
            color: "#6c757d",
            marginBottom: "1rem",
            display: "grid",
            gap: "0.25rem",
          }}
        >
          <div>📅 {formatDate(ticket.event?.start_date)}</div>
          <div>📍 {ticket.event?.location}</div>
          <div>🎫 {ticket.ticket_number}</div>
          <div>💰 Kupljeno: {formatDate(ticket.purchase_date)}</div>
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
              padding: "0.25rem 0.75rem",
              backgroundColor: getStatusColor(ticket.status),
              color: "white",
              borderRadius: "20px",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            {getStatusText(ticket.status)}
          </span>

          <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
            {formatPrice(ticket.price)} RSD
          </span>

          {ticket.discount_percentage > 0 && (
            <span
              style={{
                color: "#28a745",
                fontSize: "0.875rem",
                backgroundColor: "#d4edda",
                padding: "0.25rem 0.5rem",
                borderRadius: "4px",
              }}
            >
              -{ticket.discount_percentage}%
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          minWidth: "120px",
        }}
      >
        <Button size="small" variant="outline" onClick={onViewDetails}>
          Detalji
        </Button>

        <Button size="small" variant="outline" onClick={onDownload}>
          Preuzmi
        </Button>

        {canCancelTicket(ticket) && (
          <Button size="small" variant="danger" onClick={onCancel}>
            Otkaži
          </Button>
        )}
      </div>
    </div>
  </div>
);

// Ticket details modal component
const TicketDetailsModal = ({
  ticket,
  onClose,
  onCancel,
  onDownload,
  canCancelTicket,
  formatDate,
  formatPrice,
  getStatusColor,
  getStatusText,
}) => (
  <div style={{ padding: "1rem" }}>
    {/* QR Code section */}
    <div
      style={{
        textAlign: "center",
        marginBottom: "2rem",
        padding: "2rem",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        border: "2px dashed #dee2e6",
      }}
    >
      <div
        style={{
          fontSize: "3rem",
          marginBottom: "1rem",
        }}
      >
        📱
      </div>
      <div
        style={{
          fontSize: "1.5rem",
          fontFamily: "monospace",
          fontWeight: "bold",
          marginBottom: "0.5rem",
          letterSpacing: "2px",
        }}
      >
        {ticket.ticket_number}
      </div>
      <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
        Pokažite ovaj kod na ulazu
      </div>
      <div
        style={{
          fontSize: "0.75rem",
          color: "#6c757d",
          fontFamily: "monospace",
          marginTop: "0.5rem",
        }}
      >
        QR: {ticket.qr_code}
      </div>
    </div>

    {/* Event information */}
    <div style={{ marginBottom: "2rem" }}>
      <h4 style={{ marginBottom: "1rem" }}>Informacije o događaju</h4>
      <div
        style={{
          backgroundColor: "white",
          border: "1px solid #dee2e6",
          borderRadius: "8px",
          padding: "1rem",
        }}
      >
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Naziv:</strong>
            <span>{ticket.event?.name}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Datum i vreme:</strong>
            <span>{formatDate(ticket.event?.start_date)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Lokacija:</strong>
            <span>{ticket.event?.location}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Kategorija:</strong>
            <span>{ticket.event?.category?.name}</span>
          </div>
        </div>
      </div>
    </div>

    {/* Ticket information */}
    <div style={{ marginBottom: "2rem" }}>
      <h4 style={{ marginBottom: "1rem" }}>Informacije o karti</h4>
      <div
        style={{
          backgroundColor: "white",
          border: "1px solid #dee2e6",
          borderRadius: "8px",
          padding: "1rem",
        }}
      >
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Status:</strong>
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
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Cena:</strong>
            <span>{formatPrice(ticket.price)} RSD</span>
          </div>
          {ticket.discount_percentage > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>Originalna cena:</strong>
                <span>{formatPrice(ticket.original_price)} RSD</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>Popust:</strong>
                <span style={{ color: "#28a745" }}>
                  {ticket.discount_percentage}% (-
                  {formatPrice(ticket.discount_amount)} RSD)
                </span>
              </div>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Datum kupovine:</strong>
            <span>{formatDate(ticket.purchase_date)}</span>
          </div>
          {ticket.used_at && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>Datum korišćenja:</strong>
              <span>{formatDate(ticket.used_at)}</span>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Action buttons */}
    <div
      style={{
        display: "flex",
        gap: "1rem",
        justifyContent: "center",
        flexWrap: "wrap",
      }}
    >
      <Button variant="outline" onClick={onDownload}>
        📥 Preuzmi kartu
      </Button>

      {canCancelTicket(ticket) && (
        <Button variant="danger" onClick={onCancel}>
          ❌ Otkaži kartu
        </Button>
      )}

      <Button onClick={onClose}>Zatvori</Button>
    </div>
  </div>
);

export default UserTicketsDashboard;
