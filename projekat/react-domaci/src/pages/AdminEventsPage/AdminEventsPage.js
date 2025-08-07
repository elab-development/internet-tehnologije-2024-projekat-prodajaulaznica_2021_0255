import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import EventForm from "../../components/admin/EventForm";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";
import apiService from "../../services/api";

const AdminEventsPage = () => {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (isAdmin()) {
      loadEvents();
    }
  }, [currentPage]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getEvents(currentPage, 10);

      if (response.success) {
        setEvents(response.data || []);
        setTotalPages(response.totalPages || 1);
      }
    } catch (err) {
      setError(err.message || "Greška pri učitavanju događaja");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = (newEvent) => {
    setEvents((prev) => [newEvent, ...prev]);
    setShowCreateForm(false);
  };

  const handleUpdateEvent = (updatedEvent) => {
    setEvents((prev) =>
      prev.map((event) => (event.id === updatedEvent.id ? updatedEvent : event))
    );
    setEditingEvent(null);
  };

  const handleDeleteEvent = async () => {
    if (!deletingEvent) return;

    try {
      const response = await apiService.deleteEvent(deletingEvent.id);

      if (response.success) {
        setEvents((prev) =>
          prev.filter((event) => event.id !== deletingEvent.id)
        );
        setDeletingEvent(null);
      }
    } catch (error) {
      alert("Greška pri brisanju događaja: " + error.message);
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

  if (!isAdmin()) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <h2>Nemate dozvolu</h2>
        <p>Ova stranica je dostupna samo administratorima.</p>
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
        <h1>Upravljanje događajima</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          + Kreiraj novi događaj
        </Button>
      </div>

      {error && (
        <div
          style={{
            color: "red",
            marginBottom: "1rem",
            padding: "1rem",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "4px",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          Učitavanje događaja...
        </div>
      ) : (
        <>
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "#f8f9fa" }}>
                <tr>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      borderBottom: "1px solid #dee2e6",
                    }}
                  >
                    Naziv
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      borderBottom: "1px solid #dee2e6",
                    }}
                  >
                    Kategorija
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      borderBottom: "1px solid #dee2e6",
                    }}
                  >
                    Datum početka
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      borderBottom: "1px solid #dee2e6",
                    }}
                  >
                    Cena
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      borderBottom: "1px solid #dee2e6",
                    }}
                  >
                    Karte
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      borderBottom: "1px solid #dee2e6",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      borderBottom: "1px solid #dee2e6",
                    }}
                  >
                    Akcije
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    style={{ borderBottom: "1px solid #dee2e6" }}
                  >
                    <td style={{ padding: "1rem" }}>
                      <div>
                        <strong>{event.name}</strong>
                        {event.featured && (
                          <span
                            style={{
                              marginLeft: "0.5rem",
                              padding: "0.25rem 0.5rem",
                              backgroundColor: "#ff6b6b",
                              color: "white",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                            }}
                          >
                            Popularno
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#666" }}>
                        📍 {event.location}
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span
                        style={{
                          padding: "0.25rem 0.5rem",
                          backgroundColor: event.category?.color || "#3498db",
                          color: "white",
                          borderRadius: "4px",
                          fontSize: "0.875rem",
                        }}
                      >
                        {event.category?.name || "N/A"}
                      </span>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {formatDate(event.start_date)}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {formatPrice(event.price)} RSD
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div>
                        {event.available_tickets} / {event.total_tickets}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#666" }}>
                        {event.sold_tickets} prodano
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span
                        style={{
                          padding: "0.25rem 0.5rem",
                          backgroundColor: event.is_active
                            ? "#28a745"
                            : "#6c757d",
                          color: "white",
                          borderRadius: "4px",
                          fontSize: "0.875rem",
                        }}
                      >
                        {event.is_active ? "Aktivan" : "Završen"}
                      </span>
                    </td>
                    <td style={{ padding: "1rem", textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          justifyContent: "center",
                        }}
                      >
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => setEditingEvent(event)}
                        >
                          Uredi
                        </Button>
                        <Button
                          size="small"
                          variant="danger"
                          onClick={() => setDeletingEvent(event)}
                        >
                          Obriši
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      {/* Create Event Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Kreiraj novi događaj"
        size="large"
      >
        <EventForm
          onSave={handleCreateEvent}
          onCancel={() => setShowCreateForm(false)}
        />
      </Modal>

      {/* Edit Event Modal */}
      <Modal
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        title="Uredi događaj"
        size="large"
      >
        {editingEvent && (
          <EventForm
            event={editingEvent}
            onSave={handleUpdateEvent}
            onCancel={() => setEditingEvent(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingEvent}
        onClose={() => setDeletingEvent(null)}
        title="Potvrdi brisanje"
        size="small"
      >
        {deletingEvent && (
          <div>
            <p>Da li ste sigurni da želite da obrišete događaj:</p>
            <p>
              <strong>{deletingEvent.name}</strong>
            </p>
            <p style={{ color: "red", fontSize: "0.875rem" }}>
              Ova akcija se ne može poništiti.
            </p>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
              <Button variant="danger" onClick={handleDeleteEvent}>
                Da, obriši
              </Button>
              <Button variant="outline" onClick={() => setDeletingEvent(null)}>
                Otkaži
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminEventsPage;
