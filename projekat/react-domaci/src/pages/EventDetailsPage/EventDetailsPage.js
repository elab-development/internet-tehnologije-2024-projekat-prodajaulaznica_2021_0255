import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import InputField from "../../components/common/InputField";
import { CartContext } from "../../context/CartContext";
import { apiService } from "../../services/api";
import "./EventDetailsPage.css";

const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);

  // State
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // Učitavanje događaja
  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getEventById(id);
        setEvent(response.data);
      } catch (err) {
        setError(err.message);
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

  const formatPrice = (price) => {
    return new Intl.NumberFormat("sr-RS").format(price);
  };

  const handleAddToCart = () => {
    const cartItem = {
      id: event.id,
      title: event.title,
      price: event.price,
      date: event.date,
      time: event.time,
      location: event.location,
      image: event.image,
      quantity: quantity,
    };

    // Dodajemo u korpu specificnu količinu
    for (let i = 0; i < quantity; i++) {
      addToCart(cartItem);
    }

    setShowModal(true);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    // Navigiraj direktno u korpu
    setTimeout(() => {
      setShowModal(false);
      navigate("/cart");
    }, 1500);
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (value >= 1 && value <= event?.availableTickets) {
      setQuantity(value);
    }
  };

  if (loading) {
    return (
      <div className="event-details-page">
        <Breadcrumbs />
        <div className="loading">
          <div className="loading-spinner"></div>
          Učitavanje detalja događaja...
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="event-details-page">
        <Breadcrumbs />
        <div className="error">
          <h2>😕 Dogodila se greška</h2>
          <p>{error || "Događaj nije pronađen"}</p>
          <Button onClick={() => navigate("/events")}>
            ← Nazad na događaje
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="event-details-page">
      <Breadcrumbs />

      <div className="event-details-container">
        {/* Header sekcija */}
        <div className="event-header">
          <div className="event-image-container">
            <img
              src={event.image}
              alt={event.title}
              onClick={() => setShowImageModal(true)}
              className="event-main-image"
            />
            {event.featured && (
              <div className="featured-badge">⭐ Popularno</div>
            )}
            <div className="category-badge">{event.category}</div>
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
            <h1 className="event-title">{event.title}</h1>

            <div className="event-meta">
              <div className="meta-item">
                <span className="meta-icon">📅</span>
                <div>
                  <strong>Datum:</strong>
                  <p>{formatDate(event.date)}</p>
                </div>
              </div>

              <div className="meta-item">
                <span className="meta-icon">🕐</span>
                <div>
                  <strong>Vreme:</strong>
                  <p>{event.time}</p>
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
                  <p>{event.availableTickets} karata</p>
                </div>
              </div>
            </div>

            <div className="price-section">
              <span className="price">{formatPrice(event.price)} RSD</span>
              <span className="per-ticket">po karti</span>
            </div>
          </div>
        </div>

        {/* Opis događaja */}
        <div className="event-description">
          <h2>📋 O događaju</h2>
          <p>{event.description}</p>
        </div>

        {/* Kupovina */}
        <div className="purchase-section">
          <h2>🎫 Kupovina karata</h2>

          {event.availableTickets > 0 ? (
            <div className="purchase-form">
              <div className="quantity-selector">
                <label htmlFor="quantity">Broj karata:</label>
                <InputField
                  id="quantity"
                  type="number"
                  min="1"
                  max={event.availableTickets}
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
              <h3>😞 Rasprodato</h3>
              <p>Nažalost, sve karte za ovaj događaj su rasprodane.</p>
            </div>
          )}
        </div>

        {/* Navigacija */}
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
        title="✅ Uspešno dodano!"
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
        title={event.title}
        size="large"
      >
        <div className="image-modal">
          <img src={event.image} alt={event.title} className="full-image" />
        </div>
      </Modal>
    </div>
  );
};

export default EventDetailsPage;
