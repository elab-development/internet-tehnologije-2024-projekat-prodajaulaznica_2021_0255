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
  const [showingQRCode, setShowingQRCode] = useState(null);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loadingQR, setLoadingQR] = useState(false);

  // Osnovni filteri bez paginacije za kompaktnu verziju
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    sortBy: "purchase_date",
    sortOrder: "desc",
    per_page: 5, // Ograničeno na 5 karata
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    used: 0,
    cancelled: 0,
  });

  useEffect(() => {
    loadTickets();
  }, [filters]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiService.getMyTickets(filters);

      if (response.success) {
        setTickets(response.data.tickets || []);
        setStats(response.data.stats || stats);
      }
    } catch (err) {
      setError(err.message || "Greška pri učitavanju karata");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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

        // Kreiraj HTML sadržaj za ticket (isti kao u originalnoj komponenti)
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

  const handleCancelTicket = async (ticketId) => {
    if (!window.confirm("Da li ste sigurni da želite da otkažete ovu kartu?")) {
      return;
    }

    try {
      const response = await apiService.cancelTicket(ticketId);

      if (response.success) {
        loadTickets();
        alert("Karta je uspešno otkazana");
      }
    } catch (err) {
      alert("Greška pri otkazivanju karte: " + err.message);
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

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>⏳</div>
        <p>Učitavanje vaših karata...</p>
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
      {/* Header sa statistikama */}
      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>🎫 Moje karte</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              variant="outline"
              size="small"
              onClick={() => (window.location.href = "/my-tickets")}
            >
              Prikaži sve
            </Button>
            <Button variant="outline" size="small" onClick={loadTickets}>
              🔄
            </Button>
          </div>
        </div>

        {/* Kompaktne statistike */}
        {stats && Object.keys(stats).length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            <StatCard
              title="Ukupno"
              value={stats.total || 0}
              color="#007bff"
              bgColor="#e3f2fd"
              icon="🎫"
            />
            <StatCard
              title="Aktivne"
              value={stats.active || 0}
              color="#28a745"
              bgColor="#d4edda"
              icon="✅"
            />
            <StatCard
              title="Otkazane"
              value={stats.cancelled || 0}
              color="#dc3545"
              bgColor="#f8d7da"
              icon="❌"
            />
            <StatCard
              title="Iskorišćene"
              value={stats.used || 0}
              color="#6c757d"
              bgColor="#e9ecef"
              icon="✔️"
            />
          </div>
        )}
      </div>

      {/* Kompaktni filteri */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          style={{
            padding: "0.5rem",
            border: "1px solid #ced4da",
            borderRadius: "6px",
            fontSize: "0.875rem",
          }}
        >
          <option value="all">Sve karte</option>
          <option value="active">Aktivne</option>
          <option value="used">Iskorišćene</option>
          <option value="cancelled">Otkazane</option>
        </select>

        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleFilterChange("search", e.target.value)}
          placeholder="Pretraži događaje..."
          style={{
            padding: "0.5rem",
            border: "1px solid #ced4da",
            borderRadius: "6px",
            fontSize: "0.875rem",
            minWidth: "200px",
          }}
        />
      </div>

      {tickets.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem 1rem",
            backgroundColor: "#f8f9fa",
            borderRadius: "12px",
            border: "2px dashed #dee2e6",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎫</div>
          <h3 style={{ marginBottom: "0.5rem", color: "#495057" }}>
            Nema karata
          </h3>
          <p style={{ color: "#6c757d", marginBottom: "1.5rem" }}>
            {filters.status === "all"
              ? "Nemate kupljenih karata."
              : `Nemate karata sa statusom "${getStatusText(filters.status)}".`}
          </p>
          <Button onClick={() => (window.location.href = "/events")}>
            🎭 Pogledaj događaje
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
            <CompactTicketCard
              key={ticket.id}
              ticket={ticket}
              onViewDetails={() => setSelectedTicket(ticket)}
              onShowQR={() => handleShowQR(ticket)}
              onDownload={() => handleDownloadTicket(ticket)}
              onCancel={() => handleCancelTicket(ticket.id)}
              canCancelTicket={canCancelTicket}
              formatDate={formatDate}
              formatPrice={formatPrice}
              getStatusColor={getStatusColor}
              getStatusText={getStatusText}
            />
          ))}
        </div>
      )}

      {/* Modals */}
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
            formatDate={formatDate}
            formatPrice={formatPrice}
            getStatusColor={getStatusColor}
            getStatusText={getStatusText}
          />
        )}
      </Modal>

      <QRCodeModal
        isOpen={!!showingQRCode}
        onClose={() => {
          setShowingQRCode(null);
          setQrCodeData(null);
        }}
        ticket={showingQRCode}
        qrCodeData={qrCodeData}
        loading={loadingQR}
      />
    </div>
  );
};

// Helper Components
const StatCard = ({ title, value, color, bgColor, icon }) => (
  <div
    style={{
      backgroundColor: bgColor,
      padding: "1rem",
      borderRadius: "8px",
      textAlign: "center",
      border: `1px solid ${color}30`,
    }}
  >
    <div style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>{icon}</div>
    <div
      style={{
        fontSize: "1.25rem",
        fontWeight: "bold",
        color,
        marginBottom: "0.125rem",
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: "0.75rem", color: "#6c757d", fontWeight: "500" }}>
      {title}
    </div>
  </div>
);

const CompactTicketCard = ({
  ticket,
  onViewDetails,
  onShowQR,
  onDownload,
  onCancel,
  canCancelTicket,
  formatDate,
  formatPrice,
  getStatusColor,
  getStatusText,
}) => (
  <div
    style={{
      backgroundColor: "white",
      border: "1px solid #dee2e6",
      borderRadius: "8px",
      padding: "1rem",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
      transition: "box-shadow 0.2s",
    }}
    onMouseEnter={(e) =>
      (e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)")
    }
    onMouseLeave={(e) =>
      (e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)")
    }
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
        <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>
          {ticket.event?.name}
        </h4>

        <div
          style={{
            fontSize: "0.8rem",
            color: "#6c757d",
            marginBottom: "0.75rem",
            display: "grid",
            gap: "0.25rem",
          }}
        >
          <div>📅 {formatDate(ticket.event?.start_date)}</div>
          <div>📍 {ticket.event?.location}</div>
          <div>🎫 {ticket.ticket_number}</div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              padding: "0.25rem 0.75rem",
              backgroundColor: getStatusColor(ticket.status),
              color: "white",
              borderRadius: "15px",
              fontSize: "0.75rem",
              fontWeight: "600",
            }}
          >
            {getStatusText(ticket.status)}
          </span>

          <span style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
            {formatPrice(ticket.price)} RSD
          </span>

          {ticket.discount_percentage > 0 && (
            <span
              style={{
                color: "#28a745",
                fontSize: "0.75rem",
                backgroundColor: "#d4edda",
                padding: "0.125rem 0.5rem",
                borderRadius: "10px",
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
          minWidth: "100px",
        }}
      >
        <Button size="small" variant="outline" onClick={onViewDetails}>
          📋 Detalji
        </Button>

        <Button size="small" variant="outline" onClick={onShowQR}>
          📱 QR
        </Button>

        <Button size="small" variant="outline" onClick={onDownload}>
          📥 PDF
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

const TicketDetails = ({
  ticket,
  onClose,
  formatDate,
  formatPrice,
  getStatusColor,
  getStatusText,
}) => (
  <div style={{ padding: "1rem" }}>
    <div
      style={{
        textAlign: "center",
        marginBottom: "2rem",
        padding: "1.5rem",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        border: "2px dashed #dee2e6",
      }}
    >
      <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎫</div>
      <div
        style={{
          fontSize: "1.25rem",
          fontFamily: "monospace",
          fontWeight: "bold",
          marginBottom: "0.5rem",
          letterSpacing: "1px",
        }}
      >
        {ticket.ticket_number}
      </div>
      <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
        Elektronska karta
      </div>
    </div>

    <div style={{ marginBottom: "2rem" }}>
      <h4>Informacije o događaju</h4>
      <div style={{ display: "grid", gap: "0.5rem", fontSize: "0.9rem" }}>
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
      <div style={{ display: "grid", gap: "0.5rem", fontSize: "0.9rem" }}>
        <div>
          <strong>Status:</strong>{" "}
          <span
            style={{
              padding: "0.25rem 0.5rem",
              backgroundColor: getStatusColor(ticket.status),
              color: "white",
              borderRadius: "12px",
              fontSize: "0.75rem",
              marginLeft: "0.5rem",
            }}
          >
            {getStatusText(ticket.status)}
          </span>
        </div>
        <div>
          <strong>Cena:</strong> {formatPrice(ticket.price)} RSD
        </div>
        <div>
          <strong>Kupljeno:</strong> {formatDate(ticket.purchase_date)}
        </div>
        {ticket.discount_percentage > 0 && (
          <div>
            <strong>Popust:</strong> {ticket.discount_percentage}%
          </div>
        )}
        {ticket.used_at && (
          <div>
            <strong>Korišćeno:</strong> {formatDate(ticket.used_at)}
          </div>
        )}
      </div>
    </div>

    <div style={{ textAlign: "center" }}>
      <Button onClick={onClose}>Zatvori</Button>
    </div>
  </div>
);

const QRCodeModal = ({ isOpen, onClose, ticket, qrCodeData, loading }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="QR kod karte" size="medium">
    <div style={{ textAlign: "center", padding: "1rem" }}>
      {loading ? (
        <div>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <p>Učitavanje QR koda...</p>
        </div>
      ) : qrCodeData ? (
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <h4>{ticket?.event?.name}</h4>
            <p style={{ fontSize: "0.9rem", color: "#6c757d" }}>
              {ticket?.ticket_number}
            </p>
          </div>
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "8px",
              display: "inline-block",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
            dangerouslySetInnerHTML={{ __html: qrCodeData.qr_code_svg }}
          />
          <p
            style={{
              marginTop: "1rem",
              fontSize: "0.875rem",
              color: "#6c757d",
            }}
          >
            Pokažite ovaj QR kod na ulazu
          </p>
          <Button onClick={onClose} style={{ marginTop: "1rem" }}>
            Zatvori
          </Button>
        </div>
      ) : (
        <div>
          <p>Greška pri učitavanju QR koda</p>
          <Button onClick={onClose}>Zatvori</Button>
        </div>
      )}
    </div>
  </Modal>
);

export default PurchaseHistory;
