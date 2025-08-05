import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../Button";
import { CartContext } from "../../../context/CartContext";
import "./EventCard.css";

const EventCard = ({ event, showAddToCart = true, compact = false }) => {
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);

  const handleViewDetails = () => {
    navigate(`/events/${event.id}`);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation(); // Sprečava otvaranje detalja kada se klikne na dugme
    addToCart({
      id: event.id,
      title: event.title,
      price: event.price,
      date: event.date,
      time: event.time,
      location: event.location,
      image: event.image,
      quantity: 1,
    });

    // Prikaži obaveštenje
    alert(`Dodato u korpu: ${event.title}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("sr-RS", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("sr-RS").format(price);
  };

  return (
    <div
      className={`event-card ${compact ? "event-card-compact" : ""}`}
      onClick={handleViewDetails}
    >
      <div className="event-card-image">
        <img src={event.image} alt={event.title} />
        {event.featured && <span className="featured-badge">⭐ Popularno</span>}
        <div className="category-badge">{event.category}</div>
      </div>

      <div className="event-card-content">
        <h3 className="event-title">{event.title}</h3>

        <div className="event-details">
          <div className="event-date">
            <span className="icon">📅</span>
            <span>{formatDate(event.date)}</span>
          </div>

          <div className="event-time">
            <span className="icon">🕐</span>
            <span>{event.time}</span>
          </div>

          <div className="event-location">
            <span className="icon">📍</span>
            <span>{event.location}</span>
          </div>
        </div>

        {!compact && <p className="event-description">{event.description}</p>}

        <div className="event-card-footer">
          <div className="price-section">
            <span className="price">{formatPrice(event.price)} RSD</span>
            <span className="available-tickets">
              {event.availableTickets > 0
                ? `${event.availableTickets} dostupno`
                : "Rasprodato"}
            </span>
          </div>

          {showAddToCart && (
            <div className="card-actions">
              <Button
                variant="outline"
                size="small"
                onClick={handleViewDetails}
              >
                Detalji
              </Button>

              {event.availableTickets > 0 && (
                <Button size="small" onClick={handleAddToCart}>
                  Dodaj u korpu
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;
