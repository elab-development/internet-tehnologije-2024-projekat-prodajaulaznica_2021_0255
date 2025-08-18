import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import EventForm from "../../components/admin/EventForm";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import DeleteConfirmationModal from "../../components/common/DeleteConfirmationModal";
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
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

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
        // 🔧 Ispravka: pristupite podacima iz nested strukture
        const eventsData = response.data?.data || response.data || [];
        setEvents(Array.isArray(eventsData) ? eventsData : []);

        // Takođe ažurirajte pagination podatke
        setTotalPages(response.data?.last_page || 1);
      }
    } catch (err) {
      setError(err.message || "Greška pri učitavanju događaja");
      setEvents([]); // Osigurajte da je uvek niz
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

    setDeleteLoading(true);
    try {
      const response = await apiService.deleteEvent(deletingEvent.id);

      if (response.success) {
        setEvents((prev) =>
          prev.filter((event) => event.id !== deletingEvent.id)
        );
        setDeletingEvent(null);

        // Show success message
        setTimeout(() => {
          alert("Događaj je uspešno obrisan.");
        }, 100);
      }
    } catch (error) {
      alert("Greška pri brisanju događaja: " + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      setExporting(true);
      const response = await apiService.exportEvents(format);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `events_${new Date().toISOString().split("T")[0]}.${format}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Greška pri eksportu: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  const getEventDeletionInfo = (event) => {
    const soldTickets = event.total_tickets - event.available_tickets;
    const isEventActive = new Date(event.end_date) > new Date();

    let warnings = [];

    if (soldTickets > 0) {
      warnings.push(`Ovaj događaj ima ${soldTickets} prodanih karata.`);
    }

    if (isEventActive) {
      warnings.push("Događaj je još uvek aktivan.");
    }

    if (event.featured) {
      warnings.push("Događaj je označen kao popularan.");
    }

    return {
      hasSoldTickets: soldTickets > 0,
      isActive: isEventActive,
      warnings: warnings,
      soldTickets: soldTickets,
    };
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
        <div>
          <h1>Upravljanje događajima</h1>
          <p style={{ color: "#666", margin: "0.5rem 0 0 0" }}>
            Ukupno događaja: {events.length}
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Button
            variant="outline"
            onClick={() => handleExport("csv")}
            disabled={exporting}
          >
            {exporting ? "Eksportovanje..." : "📊 Eksportuj CSV"}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport("html")}
            disabled={exporting}
          >
            📄 Eksportuj HTML
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            + Kreiraj novi događaj
          </Button>
        </div>
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
          <Button
            variant="outline"
            size="small"
            onClick={loadEvents}
            style={{ marginLeft: "1rem" }}
          >
            Pokušaj ponovo
          </Button>
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
                {events.map((event) => {
                  const deletionInfo = getEventDeletionInfo(event);

                  return (
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
                            disabled={deleteLoading}
                          >
                            Obriši
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {events.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <h3>Nema događaja</h3>
                <p style={{ color: "#666" }}>
                  Kreirajte prvi događaj klikom na dugme iznad.
                </p>
              </div>
            )}
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
      {deletingEvent && (
        <DeleteConfirmationModal
          isOpen={!!deletingEvent}
          onClose={() => setDeletingEvent(null)}
          onConfirm={handleDeleteEvent}
          title="Obriši događaj"
          message="Da li ste sigurni da želite da obrišete ovaj događaj?"
          itemName={deletingEvent.name}
          requireConfirmation={
            getEventDeletionInfo(deletingEvent).hasSoldTickets
          }
          confirmationText="OBRIŠI"
          additionalInfo={
            getEventDeletionInfo(deletingEvent).warnings.length > 0 && (
              <div>
                <strong>Napomene:</strong>
                <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.5rem" }}>
                  {getEventDeletionInfo(deletingEvent).warnings.map(
                    (warning, index) => (
                      <li key={index}>{warning}</li>
                    )
                  )}
                </ul>
              </div>
            )
          }
        />
      )}
    </div>
  );
};

export default AdminEventsPage;
