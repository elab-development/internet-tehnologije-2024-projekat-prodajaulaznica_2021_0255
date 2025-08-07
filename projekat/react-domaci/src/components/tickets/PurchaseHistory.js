import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import Modal from "../common/Modal";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api";

const PurchaseHistory = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showReceipt, setShowReceipt] = useState(null);

  // Novi state za filtere
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    sortBy: "purchase_date",
    sortOrder: "desc",
    per_page: 10,
    page: 1,
  });

  useEffect(() => {
    loadTickets();
  }, [filters]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMyTickets(filters);

      if (response.success) {
        setTickets(response.data.tickets || []);
        setPagination(response.data.pagination || {});
        setStats(response.data.stats || {});
      }
    } catch (err) {
      setError(err.message || "Greška pri učitavanju karata");
    } finally {
      setLoading(false);
    }
  };

  // Nova funkcija za generisanje receipt-a
  const handleGenerateReceipt = async (ticketId) => {
    try {
      const response = await apiService.generateReceipt(ticketId);
      if (response.success) {
        setShowReceipt(response.data);
      }
    } catch (err) {
      alert("Greška pri generisanju računa: " + err.message);
    }
  };

  // Funkcija za promenu filtera
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset na prvu stranu kada se menjaju filteri
    }));
  };

  // Funkcija za promenu strane
  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
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
          <h2>Moje karte</h2>
          <Button variant="outline" onClick={loadTickets}>
            Osveži
          </Button>
        </div>

        {/* Statistike */}
        {stats && Object.keys(stats).length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                padding: "1rem",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                {stats.total_tickets || 0}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                Ukupno karata
              </div>
            </div>
            <div
              style={{
                padding: "1rem",
                backgroundColor: "#d4edda",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                {stats.active_tickets || 0}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#155724" }}>
                Aktivne karte
              </div>
            </div>
            <div
              style={{
                padding: "1rem",
                backgroundColor: "#d1ecf1",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                {formatPrice(stats.total_spent || 0)} RSD
              </div>
              <div style={{ fontSize: "0.875rem", color: "#0c5460" }}>
                Ukupno potrošeno
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filteri */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
          padding: "1rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontSize: "0.875rem",
            }}
          >
            Status:
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ced4da",
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
              fontSize: "0.875rem",
            }}
          >
            Pretraga:
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            placeholder="Naziv događaja ili lokacija..."
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ced4da",
              borderRadius: "4px",
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontSize: "0.875rem",
            }}
          >
            Sortiranje:
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange("sortBy", e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ced4da",
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
              fontSize: "0.875rem",
            }}
          >
            Redosled:
          </label>
          <select
            value={filters.sortOrder}
            onChange={(e) => handleFilterChange("sortOrder", e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ced4da",
              borderRadius: "4px",
            }}
          >
            <option value="desc">Opadajuće</option>
            <option value="asc">Rastući</option>
          </select>
        </div>
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
        <>
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

                    {/* Nova dugme za receipt */}
                    <Button
                      size="small"
                      variant="outline"
                      onClick={() => handleGenerateReceipt(ticket.id)}
                    >
                      Račun
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

          {/* Paginacija */}
          {pagination && pagination.last_page > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "1rem",
                marginTop: "2rem",
                padding: "1rem",
              }}
            >
              <Button
                variant="outline"
                size="small"
                disabled={pagination.current_page === 1}
                onClick={() => handlePageChange(pagination.current_page - 1)}
              >
                Prethodna
              </Button>

              <span style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                Strana {pagination.current_page} od {pagination.last_page}(
                {pagination.total} ukupno)
              </span>

              <Button
                variant="outline"
                size="small"
                disabled={pagination.current_page === pagination.last_page}
                onClick={() => handlePageChange(pagination.current_page + 1)}
              >
                Sledeća
              </Button>
            </div>
          )}
        </>
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

      {/* Receipt modal */}
      <Modal
        isOpen={!!showReceipt}
        onClose={() => setShowReceipt(null)}
        title="Račun"
        size="medium"
      >
        {showReceipt && (
          <ReceiptView
            receipt={showReceipt}
            onClose={() => setShowReceipt(null)}
          />
        )}
      </Modal>
    </div>
  );
};

// Nova komponenta za prikaz receipt-a
const ReceiptView = ({ receipt, onClose }) => {
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ padding: "1rem", fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "2rem",
          borderBottom: "2px solid #000",
          paddingBottom: "1rem",
        }}
      >
        <h2 style={{ margin: "0", fontSize: "1.5rem" }}>
          {receipt.company.name}
        </h2>
        <div
          style={{
            fontSize: "0.875rem",
            color: "#6c757d",
            marginTop: "0.5rem",
          }}
        >
          <div>{receipt.company.address}</div>
          <div>PIB: {receipt.company.tax_number}</div>
          <div>Tel: {receipt.company.phone}</div>
        </div>
      </div>

      {/* Receipt info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h4>Informacije o računu</h4>
          <div>
            <strong>Broj računa:</strong> {receipt.receipt_number}
          </div>
          <div>
            <strong>Datum izdavanja:</strong> {formatDate(receipt.issue_date)}
          </div>
        </div>
        <div>
          <h4>Kupac</h4>
          <div>
            <strong>Ime:</strong> {receipt.customer.name}
          </div>
          <div>
            <strong>Email:</strong> {receipt.customer.email}
          </div>
        </div>
      </div>

      {/* Event info */}
      <div style={{ marginBottom: "2rem" }}>
        <h4>Događaj</h4>
        <div>
          <strong>Naziv:</strong> {receipt.event.name}
        </div>
        <div>
          <strong>Datum:</strong> {formatDate(receipt.event.start_date)}
        </div>
        <div>
          <strong>Lokacija:</strong> {receipt.event.location}
        </div>
        <div>
          <strong>Kategorija:</strong> {receipt.event.category}
        </div>
      </div>

      {/* Ticket details */}
      <div style={{ marginBottom: "2rem" }}>
        <h4>Detalji karte</h4>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #dee2e6" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Opis</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Cena</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "0.5rem" }}>
                Karta - {receipt.event.name}
                <br />
                <small>Broj karte: {receipt.ticket.ticket_number}</small>
              </td>
              <td style={{ textAlign: "right", padding: "0.5rem" }}>
                {formatPrice(receipt.ticket.original_price)} RSD
              </td>
            </tr>
            {receipt.ticket.discount_percentage > 0 && (
              <tr>
                <td style={{ padding: "0.5rem" }}>
                  Popust ({receipt.ticket.discount_percentage}%)
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "0.5rem",
                    color: "#28a745",
                  }}
                >
                  -{formatPrice(receipt.ticket.discount_amount)} RSD
                </td>
              </tr>
            )}
            <tr style={{ borderTop: "1px solid #dee2e6", fontWeight: "bold" }}>
              <td style={{ padding: "0.5rem" }}>UKUPNO</td>
              <td style={{ textAlign: "right", padding: "0.5rem" }}>
                {formatPrice(receipt.ticket.price)} RSD
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          marginTop: "2rem",
          paddingTop: "1rem",
          borderTop: "1px solid #dee2e6",
        }}
      >
        <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
          Hvala vam na kupovini!
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          marginTop: "2rem",
        }}
      >
        <Button variant="outline" onClick={handlePrint}>
          Štampaj
        </Button>
        <Button onClick={onClose}>Zatvori</Button>
      </div>
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
