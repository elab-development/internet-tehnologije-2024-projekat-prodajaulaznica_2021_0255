import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import InputField from "../common/InputField";
import Modal from "../common/Modal";
import Pagination from "../common/Pagination";
import TicketCancellation from "./TicketCancellation";
import QRCodeDisplay from "./QRCodeDisplay";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api";

const UserTicketsDashboard = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [cancellingTicket, setCancellingTicket] = useState(null);
  const [showingQRCode, setShowingQRCode] = useState(null);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loadingQR, setLoadingQR] = useState(false);
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
    setCurrentPage(1);
  };

  const handleCancelTicket = (ticket) => {
    setCancellingTicket(ticket);
  };

  const handleCancellationSuccess = (result) => {
    setCancellingTicket(null);
    loadTickets();
    alert(
      `Karta je uspešno otkazana. Povraćaj: ${formatPrice(
        result.refund_info.refund_amount
      )} RSD`
    );
  };

  const handleShowQR = async (ticket) => {
    try {
      setLoadingQR(true);
      setShowingQRCode(ticket);

      const response = await apiService.getTicketQRCode(ticket.id);

      if (response.success) {
        setQrCodeData(response.data);
      } else {
        throw new Error(response.message || "Greška pri učitavanju QR koda");
      }
    } catch (err) {
      alert("Greška pri učitavanju QR koda: " + err.message);
      setShowingQRCode(null);
    } finally {
      setLoadingQR(false);
    }
  };

  const handleDownloadTicket = async (ticket) => {
    try {
      const response = await apiService.generateTicketPDF(ticket.id);

      if (response.success) {
        const ticketData = response.data;

        // Kreiraj HTML sadržaj za ticket
        const ticketHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Elektronska karta - ${ticketData.ticket_number}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .ticket-container {
            background: white;
            border: 3px dashed #333;
            border-radius: 15px;
            padding: 30px;
            margin: 20px 0;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .ticket-header {
            text-align: center;
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .ticket-title {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin: 0 0 10px 0;
        }
        .ticket-number {
            font-size: 18px;
            font-family: 'Courier New', monospace;
            background: #f8f9fa;
            padding: 8px 16px;
            border-radius: 8px;
            display: inline-block;
            letter-spacing: 2px;
        }
        .event-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        .info-section h3 {
            color: #007bff;
            margin-bottom: 15px;
            font-size: 18px;
            border-bottom: 1px solid #007bff;
            padding-bottom: 5px;
        }
        .info-item {
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
        }
        .info-label {
            font-weight: bold;
            color: #555;
        }
        .info-value {
            color: #333;
        }
        .qr-section {
            text-align: center;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .qr-code {
            display: inline-block;
            padding: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .instructions {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
        }
        .instructions h4 {
            margin-top: 0;
            color: #1976d2;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
        @media print {
            body { background: white; }
            .ticket-container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="ticket-container">
        <div class="ticket-header">
            <div class="ticket-title">🎫 ELEKTRONSKA KARTA</div>
            <div class="ticket-number">${ticketData.ticket_number}</div>
        </div>

        <div class="event-info">
            <div class="info-section">
                <h3>📅 Informacije o događaju</h3>
                <div class="info-item">
                    <span class="info-label">Naziv:</span>
                    <span class="info-value">${ticketData.event.name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Datum:</span>
                    <span class="info-value">${ticketData.event.date}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Vreme:</span>
                    <span class="info-value">${ticketData.event.time}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Lokacija:</span>
                    <span class="info-value">${ticketData.event.location}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Kategorija:</span>
                    <span class="info-value">${ticketData.event.category}</span>
                </div>
            </div>

            <div class="info-section">
                <h3>👤 Informacije o karti</h3>
                <div class="info-item">
                    <span class="info-label">Vlasnik:</span>
                    <span class="info-value">${ticketData.user.name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${ticketData.user.email}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Cena:</span>
                    <span class="info-value">${formatPrice(
                      ticketData.price
                    )} RSD</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Kupljeno:</span>
                    <span class="info-value">${ticketData.purchase_date}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Status:</span>
                    <span class="info-value">${getStatusText(
                      ticketData.status
                    )}</span>
                </div>
            </div>
        </div>

        <div class="qr-section">
            <h3>📱 QR kod za ulaz</h3>
            <div class="qr-code">
                ${ticketData.qr_code_svg}
            </div>
            <p><strong>Pokažite ovaj kod na ulazu na događaj</strong></p>
        </div>

        <div class="instructions">
            <h4>📋 Napomene:</h4>
            <ul>
                <li>Ponesitе ovu kartu (štampanu ili na telefonu) i važeći lični dokument</li>
                <li>QR kod se može skenirati direktno sa ekrana telefona</li>
                <li>Karta važi samo za navedeni datum i vreme</li>
                <li>U slučaju problema kontaktirajte organizatore</li>
            </ul>
        </div>

        <div class="footer">
            <p>Ticket Master Pro | Elektronska karta generisana ${new Date().toLocaleString(
              "sr-RS"
            )}</p>
        </div>
    </div>
</body>
</html>`;

        // Kreiraj i preuzmi HTML fajl
        const blob = new Blob([ticketHTML], {
          type: "text/html;charset=utf-8",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ticket-${ticketData.ticket_number}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Opciono: Otvori u novom tab-u za štampanje
        const printWindow = window.open("", "_blank");
        printWindow.document.write(ticketHTML);
        printWindow.document.close();
      } else {
        throw new Error(response.message || "Greška pri generisanju karte");
      }
    } catch (err) {
      console.error("Download error:", err);
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
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header with stats */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>Moje karte</h1>
        <p style={{ color: "#6c757d", marginBottom: "1.5rem" }}>
          Upravljajte svojim kartama, pristupite QR kodovima i pratite status
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
          }}
        >
          <StatCard
            title="Ukupno karata"
            value={stats.total}
            color="#007bff"
            bgColor="#e3f2fd"
            icon="🎫"
          />
          <StatCard
            title="Aktivne karte"
            value={stats.active}
            color="#28a745"
            bgColor="#d4edda"
            icon="✅"
          />
          <StatCard
            title="Otkazane karte"
            value={stats.cancelled}
            color="#dc3545"
            bgColor="#f8d7da"
            icon="❌"
          />
          <StatCard
            title="Iskorišćene karte"
            value={stats.used}
            color="#6c757d"
            bgColor="#e9ecef"
            icon="✔️"
          />
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
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

          <SelectField
            label="Status"
            value={filters.status}
            onChange={(value) => handleFilterChange("status", value)}
            options={[
              { value: "all", label: "Sve karte" },
              { value: "active", label: "Aktivne" },
              { value: "used", label: "Iskorišćene" },
              { value: "cancelled", label: "Otkazane" },
            ]}
          />

          <SelectField
            label="Sortiraj po"
            value={filters.sortBy}
            onChange={(value) => handleFilterChange("sortBy", value)}
            options={[
              { value: "purchase_date", label: "Datum kupovine" },
              { value: "event_date", label: "Datum događaja" },
              { value: "price", label: "Cena" },
              { value: "status", label: "Status" },
            ]}
          />

          <SelectField
            label="Redosled"
            value={filters.sortOrder}
            onChange={(value) => handleFilterChange("sortOrder", value)}
            options={[
              { value: "desc", label: "Opadajući" },
              { value: "asc", label: "Rastući" },
            ]}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            color: "#dc3545",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>⚠️ {error}</span>
          <Button variant="outline" size="small" onClick={loadTickets}>
            Pokušaj ponovo
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <p>Učitavanje karata...</p>
        </div>
      )}

      {/* Tickets list */}
      {!loading && (
        <>
          {tickets.length === 0 ? (
            <EmptyState filters={filters} getStatusText={getStatusText} />
          ) : (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                overflow: "hidden",
              }}
            >
              {tickets.map((ticket, index) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  isLast={index === tickets.length - 1}
                  onViewDetails={() => setSelectedTicket(ticket)}
                  onCancel={() => handleCancelTicket(ticket)}
                  onDownload={() => handleDownloadTicket(ticket)}
                  onShowQR={() => handleShowQR(ticket)}
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
            <div style={{ marginTop: "2rem" }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      {/* Modals */}
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
            onCancel={() => handleCancelTicket(selectedTicket)}
            onDownload={() => handleDownloadTicket(selectedTicket)}
            onShowQR={() => handleShowQR(selectedTicket)}
            canCancelTicket={canCancelTicket}
            formatDate={formatDate}
            formatPrice={formatPrice}
            getStatusColor={getStatusColor}
            getStatusText={getStatusText}
          />
        )}
      </Modal>

      <TicketCancellation
        ticket={cancellingTicket}
        isOpen={!!cancellingTicket}
        onClose={() => setCancellingTicket(null)}
        onSuccess={handleCancellationSuccess}
      />

      <QRCodeDisplay
        ticket={showingQRCode}
        qrCodeData={qrCodeData}
        isOpen={!!showingQRCode}
        loading={loadingQR}
        onClose={() => {
          setShowingQRCode(null);
          setQrCodeData(null);
        }}
      />
    </div>
  );
};

// Helper Components
const StatCard = ({ title, value, color, bgColor, icon }) => (
  <div
    style={{
      backgroundColor: bgColor,
      padding: "1.5rem",
      borderRadius: "12px",
      textAlign: "center",
      border: `2px solid ${color}20`,
    }}
  >
    <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{icon}</div>
    <div
      style={{
        fontSize: "2rem",
        fontWeight: "bold",
        color,
        marginBottom: "0.25rem",
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: "0.875rem", color: "#6c757d", fontWeight: "500" }}>
      {title}
    </div>
  </div>
);

const SelectField = ({ label, value, onChange, options }) => (
  <div>
    <label
      style={{
        display: "block",
        marginBottom: "0.5rem",
        fontWeight: "500",
        color: "#374151",
      }}
    >
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "0.75rem",
        border: "2px solid #e5e7eb",
        borderRadius: "8px",
        fontSize: "0.875rem",
        backgroundColor: "white",
        transition: "border-color 0.2s",
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const EmptyState = ({ filters, getStatusText }) => (
  <div
    style={{
      textAlign: "center",
      padding: "4rem 2rem",
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    }}
  >
    <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎫</div>
    <h3 style={{ marginBottom: "1rem" }}>Nema karata</h3>
    <p style={{ color: "#6c757d", marginBottom: "2rem" }}>
      {filters.status === "all"
        ? "Nemate kupljenih karata."
        : `Nemate karata sa statusom "${getStatusText(filters.status)}".`}
    </p>
    <Button onClick={() => (window.location.href = "/events")}>
      🎭 Pogledaj događaje
    </Button>
  </div>
);

const TicketCard = ({
  ticket,
  isLast,
  onViewDetails,
  onCancel,
  onDownload,
  onShowQR,
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
      borderBottom: isLast ? "none" : "1px solid #e5e7eb",
      position: "relative",
      transition: "background-color 0.2s",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
  >
    {isEventStartingSoon(ticket) && (
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          backgroundColor: "#ffc107",
          color: "#212529",
          padding: "0.25rem 0.75rem",
          borderRadius: "20px",
          fontSize: "0.75rem",
          fontWeight: "bold",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        ⏰ Uskoro počinje!
      </div>
    )}

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "1.5rem",
        alignItems: "start",
      }}
    >
      <div>
        <h4
          style={{
            margin: "0 0 0.75rem 0",
            fontSize: "1.2rem",
            color: "#1f2937",
          }}
        >
          {ticket.event?.name}
        </h4>

        <div
          style={{
            fontSize: "0.875rem",
            color: "#6b7280",
            marginBottom: "1rem",
            display: "grid",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>📅</span>
            <span>{formatDate(ticket.event?.start_date)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>📍</span>
            <span>{ticket.event?.location}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🎫</span>
            <span style={{ fontFamily: "monospace", fontWeight: "500" }}>
              {ticket.ticket_number}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>💰</span>
            <span>Kupljeno: {formatDate(ticket.purchase_date)}</span>
          </div>
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
              padding: "0.5rem 1rem",
              backgroundColor: getStatusColor(ticket.status),
              color: "white",
              borderRadius: "25px",
              fontSize: "0.875rem",
              fontWeight: "600",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            {getStatusText(ticket.status)}
          </span>

          <span
            style={{ fontWeight: "bold", fontSize: "1.2rem", color: "#1f2937" }}
          >
            {formatPrice(ticket.price)} RSD
          </span>

          {ticket.discount_percentage > 0 && (
            <span
              style={{
                color: "#059669",
                fontSize: "0.875rem",
                backgroundColor: "#d1fae5",
                padding: "0.25rem 0.75rem",
                borderRadius: "15px",
                fontWeight: "500",
              }}
            >
              🏷️ -{ticket.discount_percentage}%
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          minWidth: "140px",
        }}
      >
        <Button size="small" variant="outline" onClick={onViewDetails}>
          📋 Detalji
        </Button>

        <Button size="small" variant="outline" onClick={onShowQR}>
          📱 QR kod
        </Button>

        <Button size="small" variant="outline" onClick={onDownload}>
          📥 Preuzmi
        </Button>

        {canCancelTicket(ticket) && (
          <Button size="small" variant="danger" onClick={onCancel}>
            ❌ Otkaži
          </Button>
        )}
      </div>
    </div>
  </div>
);

const TicketDetailsModal = ({
  ticket,
  onClose,
  onCancel,
  onDownload,
  onShowQR,
  canCancelTicket,
  formatDate,
  formatPrice,
  getStatusColor,
  getStatusText,
}) => (
  <div style={{ padding: "1rem" }}>
    {/* Ticket Header */}
    <div
      style={{
        textAlign: "center",
        marginBottom: "2rem",
        padding: "2rem",
        backgroundColor: "#f8fafc",
        borderRadius: "12px",
        border: "2px dashed #cbd5e1",
      }}
    >
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎫</div>
      <div
        style={{
          fontSize: "1.5rem",
          fontFamily: "monospace",
          fontWeight: "bold",
          marginBottom: "0.5rem",
          letterSpacing: "2px",
          color: "#1e293b",
        }}
      >
        {ticket.ticket_number}
      </div>
      <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
        Elektronska karta za ulaz na događaj
      </div>
    </div>

    {/* Event Information */}
    <InfoSection
      title="Informacije o događaju"
      icon="🎭"
      data={[
        { label: "Naziv", value: ticket.event?.name },
        { label: "Datum i vreme", value: formatDate(ticket.event?.start_date) },
        { label: "Lokacija", value: ticket.event?.location },
        { label: "Kategorija", value: ticket.event?.category?.name },
      ]}
    />

    {/* Ticket Information */}
    <InfoSection
      title="Informacije o karti"
      icon="🎫"
      data={[
        {
          label: "Status",
          value: (
            <span
              style={{
                padding: "0.25rem 0.75rem",
                backgroundColor: getStatusColor(ticket.status),
                color: "white",
                borderRadius: "15px",
                fontSize: "0.875rem",
                fontWeight: "500",
              }}
            >
              {getStatusText(ticket.status)}
            </span>
          ),
        },
        { label: "Cena", value: `${formatPrice(ticket.price)} RSD` },
        { label: "Datum kupovine", value: formatDate(ticket.purchase_date) },
        ...(ticket.discount_percentage > 0
          ? [
              {
                label: "Popust",
                value: (
                  <span style={{ color: "#059669", fontWeight: "500" }}>
                    {ticket.discount_percentage}% popust
                  </span>
                ),
              },
            ]
          : []),
        ...(ticket.used_at
          ? [{ label: "Datum korišćenja", value: formatDate(ticket.used_at) }]
          : []),
      ]}
    />

    {/* Action Buttons */}
    <div
      style={{
        display: "flex",
        gap: "1rem",
        justifyContent: "center",
        flexWrap: "wrap",
        marginTop: "2rem",
        paddingTop: "2rem",
        borderTop: "1px solid #e2e8f0",
      }}
    >
      <Button variant="outline" onClick={onShowQR}>
        📱 Prikaži QR kod
      </Button>

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

const InfoSection = ({ title, icon, data }) => (
  <div style={{ marginBottom: "2rem" }}>
    <h4
      style={{
        marginBottom: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <span>{icon}</span>
      {title}
    </h4>
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "1rem",
      }}
    >
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {data.map((item, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "0.5rem",
              borderBottom:
                index < data.length - 1 ? "1px solid #f1f5f9" : "none",
            }}
          >
            <strong style={{ color: "#374151" }}>{item.label}:</strong>
            <span style={{ color: "#6b7280", textAlign: "right" }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default UserTicketsDashboard;
