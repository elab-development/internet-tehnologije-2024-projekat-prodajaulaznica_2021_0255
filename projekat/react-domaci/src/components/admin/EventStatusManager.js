import React, { useState } from "react";
import Button from "../common/Button";
import apiService from "../../services/api";

const EventStatusManager = ({ event, onUpdate }) => {
  const [loading, setLoading] = useState(false);

  const toggleFeatured = async () => {
    setLoading(true);
    try {
      const response = await apiService.updateEvent(event.id, {
        featured: !event.featured,
      });

      if (response.success) {
        onUpdate(response.data);
      }
    } catch (error) {
      alert("Greška pri ažuriranju: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isEventPast = new Date(event.end_date) < new Date();
  const isEventActive =
    new Date(event.start_date) <= new Date() &&
    new Date(event.end_date) > new Date();

  return (
    <div
      style={{
        padding: "1rem",
        backgroundColor: "#f8f9fa",
        borderRadius: "4px",
        border: "1px solid #dee2e6",
      }}
    >
      <h4 style={{ margin: "0 0 1rem 0" }}>Status događaja</h4>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <span
          style={{
            padding: "0.25rem 0.5rem",
            borderRadius: "4px",
            fontSize: "0.875rem",
            backgroundColor: isEventPast
              ? "#6c757d"
              : isEventActive
              ? "#28a745"
              : "#007bff",
            color: "white",
          }}
        >
          {isEventPast ? "Završen" : isEventActive ? "U toku" : "Predstojeći"}
        </span>

        {event.featured && (
          <span
            style={{
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.875rem",
              backgroundColor: "#ff6b6b",
              color: "white",
            }}
          >
            Popularno
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Button
          size="small"
          variant={event.featured ? "danger" : "outline"}
          onClick={toggleFeatured}
          disabled={loading}
        >
          {event.featured ? "Ukloni iz popularnih" : "Dodaj u popularne"}
        </Button>
      </div>
    </div>
  );
};

export default EventStatusManager;
