import React, { useState } from "react";
import Button from "../common/Button";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";

const BulkActions = ({ selectedEvents, onBulkDelete, onClearSelection }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (selectedEvents.length === 0) return null;

  const handleBulkDelete = async () => {
    try {
      await onBulkDelete(selectedEvents);
      setShowDeleteModal(false);
      onClearSelection();
    } catch (error) {
      console.error("Bulk delete error:", error);
    }
  };

  const eventsWithTickets = selectedEvents.filter(
    (event) => event.total_tickets - event.available_tickets > 0
  );

  return (
    <div
      style={{
        position: "fixed",
        bottom: "2rem",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "white",
        padding: "1rem 2rem",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        border: "1px solid #ddd",
        zIndex: 1000,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span>
          {selectedEvents.length} događaj
          {selectedEvents.length !== 1 ? "a" : ""} izabrano
        </span>

        <Button
          variant="danger"
          size="small"
          onClick={() => setShowDeleteModal(true)}
        >
          Obriši izabrane
        </Button>

        <Button variant="outline" size="small" onClick={onClearSelection}>
          Otkaži
        </Button>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title="Obriši izabrane događaje"
        message={`Da li ste sigurni da želite da obrišete ${
          selectedEvents.length
        } događaj${selectedEvents.length !== 1 ? "a" : ""}?`}
        requireConfirmation={eventsWithTickets.length > 0}
        confirmationText="OBRIŠI SVE"
        additionalInfo={
          eventsWithTickets.length > 0 && (
            <div>
              <strong>Upozorenje:</strong> {eventsWithTickets.length} od
              izabranih događaja ima prodane karte.
              <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.5rem" }}>
                {eventsWithTickets.slice(0, 3).map((event) => (
                  <li key={event.id}>
                    {event.name} (
                    {event.total_tickets - event.available_tickets} karata)
                  </li>
                ))}
                {eventsWithTickets.length > 3 && (
                  <li>... i još {eventsWithTickets.length - 3} događaja</li>
                )}
              </ul>
            </div>
          )
        }
      />
    </div>
  );
};

export default BulkActions;
