import React from "react";
import { useNavigate } from "react-router-dom";
import QuickPurchase from "../QuickPurchase";

const EventCard = ({ event }) => {
  const navigate = useNavigate();

  // Debug log da vidimo šta dobijamo
  console.log("EventCard received event:", event);

  // Handle both old mock data and new Laravel API data
  const eventData = {
    id: event.id,
    name: event.name || event.title, // Koristimo 'name' jer Laravel koristi 'name'
    title: event.name || event.title, // Zadržavamo i 'title' za kompatibilnost
    description: event.description,
    price: parseFloat(event.price) || 0,
    start_date: event.start_date || event.date, // Laravel koristi 'start_date'
    end_date: event.end_date, // Dodaj end_date
    date: event.start_date || event.date, // Zadržavamo i 'date' za kompatibilnost
    time: event.start_date
      ? new Date(event.start_date).toLocaleTimeString("sr-RS", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : event.time || "",
    location: event.location,
    image:
      event.image_url ||
      event.thumbnail_url ||
      event.image ||
      "https://picsum.photos/400/250?random=" + event.id,
    image_url: event.image_url || event.thumbnail_url, // Dodaj image_url
    category: event.category?.name || event.category || "Ostalo",
    categoryObject: event.category, // Proslijedi ceo category objekat
    // Poboljšano mapiranje available_tickets
    available_tickets: (() => {
      if (
        typeof event.available_tickets === "number" &&
        event.available_tickets >= 0
      ) {
        return event.available_tickets;
      }
      if (
        typeof event.availableTickets === "number" &&
        event.availableTickets >= 0
      ) {
        return event.availableTickets;
      }
      if (typeof event.available_tickets === "string") {
        const parsed = parseInt(event.available_tickets, 10);
        return !isNaN(parsed) && parsed >= 0 ? parsed : 100;
      }
      if (typeof event.availableTickets === "string") {
        const parsed = parseInt(event.availableTickets, 10);
        return !isNaN(parsed) && parsed >= 0 ? parsed : 100;
      }
      return 100;
    })(),
    availableTickets: (() => {
      // Isto kao available_tickets za kompatibilnost
      if (
        typeof event.available_tickets === "number" &&
        event.available_tickets >= 0
      ) {
        return event.available_tickets;
      }
      if (
        typeof event.availableTickets === "number" &&
        event.availableTickets >= 0
      ) {
        return event.availableTickets;
      }
      if (typeof event.available_tickets === "string") {
        const parsed = parseInt(event.available_tickets, 10);
        return !isNaN(parsed) && parsed >= 0 ? parsed : 100;
      }
      if (typeof event.availableTickets === "string") {
        const parsed = parseInt(event.availableTickets, 10);
        return !isNaN(parsed) && parsed >= 0 ? parsed : 100;
      }
      return 100;
    })(),
    total_tickets: event.total_tickets, // Dodaj total_tickets
    featured: event.is_featured || event.featured || false,
    can_purchase: event.can_purchase, // Dodaj can_purchase
    is_active: event.is_active, // Dodaj is_active
  };

  // Debug log za eventData
  console.log("EventCard processed eventData:", eventData);
  console.log(
    "Available tickets:",
    eventData.available_tickets,
    typeof eventData.available_tickets
  );

  const formatPrice = (price) => {
    return new Intl.NumberFormat("sr-RS").format(price);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("sr-RS", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Funkcija za određivanje da li su karte dostupne
  const isAvailable = () => {
    return eventData.available_tickets > 0;
  };

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "white",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        transition: "transform 0.2s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
      onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
    >
      <div onClick={() => navigate(`/events/${eventData.id}`)}>
        <img
          src={eventData.image}
          alt={eventData.title}
          style={{
            width: "100%",
            height: "200px",
            objectFit: "cover",
          }}
        />

        <div style={{ padding: "1rem" }}>
          {eventData.featured && (
            <span
              style={{
                backgroundColor: "#ff6b6b",
                color: "white",
                padding: "0.25rem 0.5rem",
                borderRadius: "4px",
                fontSize: "0.75rem",
                marginBottom: "0.5rem",
                display: "inline-block",
              }}
            >
              Popularno
            </span>
          )}

          <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem" }}>
            {eventData.title}
          </h3>

          <p
            style={{
              color: "#666",
              fontSize: "0.9rem",
              margin: "0 0 0.5rem 0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {eventData.description}
          </p>

          <div
            style={{
              fontSize: "0.85rem",
              color: "#888",
              marginBottom: "0.5rem",
            }}
          >
            <div>
              📅 {formatDate(eventData.date)} {eventData.time}
            </div>
            <div>📍 {eventData.location}</div>
            <div>🏷️ {eventData.category}</div>
            <div
              style={{
                color: isAvailable() ? "#28a745" : "#dc3545",
                fontWeight: "500",
              }}
            >
              🎫 {eventData.available_tickets} dostupno
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "1rem",
            }}
          >
            <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
              {formatPrice(eventData.price)} RSD
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 1rem 1rem" }}>
        {/* Proslijedi eventData umesto originalnog event objekta */}
        <QuickPurchase
          event={eventData}
          buttonText="Kupi karte"
          size="small"
          disabled={!isAvailable()}
        />
      </div>
    </div>
  );
};

export default EventCard;
