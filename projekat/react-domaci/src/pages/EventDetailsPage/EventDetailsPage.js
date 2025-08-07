import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import InputField from "../../components/common/InputField";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api";
import "./EventDetailsPage.css";

const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  // State
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // Load event from Laravel API
  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiService.getEventById(id);

        if (response.success) {
          setEvent(response.data);
        } else {
          setError(response.message || "Događaj nije pronađen");
        }
      } catch (err) {
        setError(err.message || "Greška pri učitavanju događaja");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadEvent();
    }
  }, [id]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("sr-RS", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("sr-RS", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("sr-RS").format(price);
  };

  const handleAddToCart = () => {
    if (!isAuthenticated()) {
      navigate("/login", { state: { from: { pathname: `/events/${id}` } } });
      return;
    }

    const cartItem = {
      id: event.id,
      title: event.name,
      price: parseFloat(event.price),
      date: event.start_date,
      time: formatTime(event.start_date),
      location: event.location,
      image: event.image_url || event.thumbnail_url,
      quantity: quantity,
      event_id: event.id,
    };

    // Add items to cart based on quantity
    for (let i = 0; i < quantity; i++) {
      addToCart(cartItem);
    }

    setShowModal(true);
  };

  const handleBuyNow = () => {
    if (!isAuthenticated()) {
      navigate("/login", { state: { from: { pathname: `/events/${id}` } } });
      return;
    }

    handleAddToCart();
    // Navigate to cart after a short delay
    setTimeout(() => {
      setShowModal(false);
      navigate("/cart");
    }, 1500);
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (value >= 1 && value <= (event?.available_tickets || 0)) {
      setQuantity(value);
    }
  };

  if (loading) {
    return (
      <div className="event-details-page">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Učitavanje detalja događaja...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="event-details-page">
        <Breadcrumbs />
        <div className="error">
          <h2>Dogodila se greška</h2>
          <p>{error || "Događaj nije pronađen"}</p>
          <Button onClick={() => navigate("/events")}>
            ← Nazad na događaje
          </Button>
        </div>
      </div>
    );
  }

  const isEventActive = new Date(event.end_date) > new Date();
  const canPurchase = event.can_purchase && event.available_tickets > 0;

  return (
    <div className="event-details-page">
      <Breadcrumbs />

      <div className="event-details-container">
        {/* Header section */}
        <div className="event-header">
          <div className="event-image-container">
            <img
              src={
                event.image_url ||
                event.thumbnail_url ||
                `https://picsum.photos/600/400?random=${event.id}`
              }
              alt={event.name}
              onClick={() => setShowImageModal(true)}
              className="event-main-image"
            />

            {event.featured && <div className="featured-badge">Popularno</div>}

            <div
              className="category-badge"
              style={{ backgroundColor: event.category?.color || "#3498db" }}
            >
              {event.category?.name || "Ostalo"}
            </div>

            <Button
              variant="outline"
              size="small"
              onClick={() => setShowImageModal(true)}
              className="view-image-btn"
            >
              🔍 Uvećaj
            </Button>
          </div>

          <div className="event-info">
            <h1 className="event-title">{event.name}</h1>

            <div className="event-meta">
              <div className="meta-item">
                <span className="meta-icon">📅</span>
                <div>
                  <strong>Datum:</strong>
                  <p>{formatDate(event.start_date)}</p>
                </div>
              </div>

              <div className="meta-item">
                <span className="meta-icon">⏰</span>
                <div>
                  <strong>Vreme:</strong>
                  <p>
                    {formatTime(event.start_date)} -{" "}
                    {formatTime(event.end_date)}
                  </p>
                </div>
              </div>

              <div className="meta-item">
                <span className="meta-icon">📍</span>
                <div>
                  <strong>Lokacija:</strong>
                  <p>{event.location}</p>
                </div>
              </div>

              <div className="meta-item">
                <span className="meta-icon">🎫</span>
                <div>
                  <strong>Dostupno:</strong>
                  <p>
                    {event.available_tickets} od {event.total_tickets} karata
                  </p>
                </div>
              </div>
            </div>

            <div className="price-section">
              <span className="price">{formatPrice(event.price)} RSD</span>
              <span className="per-ticket">po karti</span>
            </div>

            {!isEventActive && (
              <div className="event-status expired">
                ⚠️ Ovaj događaj je završen
              </div>
            )}
          </div>
        </div>

        {/* Description section */}
        <div className="event-description">
          <h2>O događaju</h2>
          <p>{event.description}</p>
        </div>

        {/* Purchase section */}
        <div className="purchase-section">
          <h2>Kupovina karata</h2>

          {canPurchase ? (
            <div className="purchase-form">
              <div className="quantity-selector">
                <label htmlFor="quantity">Broj karata:</label>
                <InputField
                  id="quantity"
                  type="number"
                  min="1"
                  max={event.available_tickets}
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="quantity-input"
                />
              </div>

              <div className="total-price">
                <strong>
                  Ukupno: {formatPrice(event.price * quantity)} RSD
                </strong>
              </div>

              <div className="purchase-buttons">
                <Button variant="outline" onClick={handleAddToCart} icon="🛒">
                  Dodaj u korpu
                </Button>
                <Button onClick={handleBuyNow} icon="💳" size="large">
                  Kupi odmah
                </Button>
              </div>
            </div>
          ) : (
            <div className="sold-out">
              <h3>
                {event.available_tickets === 0
                  ? "Rasprodato"
                  : "Prodaja završena"}
              </h3>
              <p>
                {event.available_tickets === 0
                  ? "Nažalost, sve karte za ovaj događaj su rasprodane."
                  : "Prodaja karata za ovaj događaj je završena."}
              </p>
            </div>
          )}
        </div>

        {/* Navigation section */}
        <div className="navigation-section">
          <Button variant="outline" onClick={() => navigate("/events")}>
            ← Nazad na događaje
          </Button>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Uspešno dodano!"
        size="small"
      >
        <div className="success-modal">
          <p>Karte su uspešno dodane u korpu.</p>
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Nastavi kupovinu
            </Button>
            <Button onClick={() => navigate("/cart")}>Idi u korpu</Button>
          </div>
        </div>
      </Modal>

      {/* Image Modal */}
      <Modal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        title={event.name}
        size="large"
      >
        <div className="image-modal">
          <img
            src={
              event.image_url ||
              event.thumbnail_url ||
              `https://picsum.photos/800/600?random=${event.id}`
            }
            alt={event.name}
            className="full-image"
          />
        </div>
      </Modal>
    </div>
  );
};

export default EventDetailsPage;
