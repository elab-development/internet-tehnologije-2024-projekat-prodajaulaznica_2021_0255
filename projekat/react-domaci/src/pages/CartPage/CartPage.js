import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import Modal from "../../components/common/Modal";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import TicketPurchase from "../../components/tickets/TicketPurchase";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import "./CartPage.css";

const CartPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
    isProcessing,
    setIsProcessing,
  } = useCart();

  const [showClearModal, setShowClearModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [error, setError] = useState("");

  // Redirect to login if not authenticated
  if (!isAuthenticated()) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <h2>Prijavite se</h2>
        <p>Morate biti prijavljeni da biste pristupili korpi.</p>
        <Button onClick={() => navigate("/login")}>Prijavite se</Button>
      </div>
    );
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat("sr-RS").format(price);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("sr-RS", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("sr-RS", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    const quantity = parseInt(newQuantity);
    if (quantity >= 1) {
      updateQuantity(itemId, quantity);
    }
  };

  const handleClearCart = () => {
    clearCart();
    setShowClearModal(false);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setShowCheckoutModal(true);
  };

  const handlePurchaseComplete = (purchaseResults) => {
    clearCart();
    setShowCheckoutModal(false);

    // Navigate to tickets page or show success
    setTimeout(() => {
      navigate("/tickets");
    }, 2000);
  };

  const handlePurchaseError = (errorMessage) => {
    setError(errorMessage);
    setIsProcessing(false);
  };

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Vaša korpa je prazna</h2>
          <p>Niste dodali nijednu kartu u korpu.</p>
          <Button onClick={() => navigate("/events")} size="large">
            Pogledaj događaje
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1>Vaša korpa</h1>
        <div className="cart-summary">
          <span className="total-items">{getTotalItems()} stavki</span>
          <span className="total-price">
            {formatPrice(getTotalPrice())} RSD
          </span>
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
            onClick={() => setError("")}
            style={{ marginLeft: "1rem" }}
          >
            Zatvori
          </Button>
        </div>
      )}

      <div className="cart-content">
        <div className="cart-items">
          <div className="cart-items-header">
            <h2>Karte u korpi</h2>
            <Button
              variant="outline"
              size="small"
              onClick={() => setShowClearModal(true)}
              className="clear-cart-btn"
            >
              Očisti korpu
            </Button>
          </div>

          <div className="cart-items-list">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="item-image">
                  <img
                    src={
                      item.image ||
                      `https://picsum.photos/100/80?random=${item.event_id}`
                    }
                    alt={item.title}
                  />
                </div>

                <div className="item-details">
                  <h3 className="item-title">{item.title}</h3>
                  <div className="item-info">
                    <div className="info-row">
                      <span className="icon">📅</span>
                      <span>
                        {formatDate(item.date)} u {formatTime(item.date)}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="icon">📍</span>
                      <span>{item.location}</span>
                    </div>
                  </div>
                </div>

                <div className="item-price">
                  <span className="single-price">
                    {formatPrice(item.price)} RSD po karti
                  </span>
                </div>

                <div className="item-controls">
                  <div className="quantity-control">
                    <label>Količina:</label>
                    <InputField
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleQuantityChange(item.id, e.target.value)
                      }
                      className="quantity-input"
                    />
                  </div>

                  <div className="item-total">
                    <strong>
                      {formatPrice(item.price * item.quantity)} RSD
                    </strong>
                  </div>

                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => removeFromCart(item.id)}
                    className="remove-btn"
                  >
                    Ukloni
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cart-sidebar">
          <div className="order-summary">
            <h3>Pregled narudžbine</h3>
            <div className="summary-row">
              <span>Stavki:</span>
              <span>{getTotalItems()}</span>
            </div>
            <div className="summary-row">
              <span>Karte:</span>
              <span>{getTotalItems()}</span>
            </div>
            <div className="summary-row total">
              <strong>
                <span>Za plaćanje:</span>
                <span>{formatPrice(getTotalPrice())} RSD</span>
              </strong>
            </div>
          </div>

          <div className="checkout-actions">
            <Button
              size="large"
              onClick={handleCheckout}
              disabled={isProcessing || cartItems.length === 0}
              className="checkout-btn"
            >
              {isProcessing ? "Obrađuje se..." : "Završi kupovinu"}
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate("/events")}
              className="continue-shopping-btn"
            >
              ← Nastavi kupovinu
            </Button>
          </div>

          <div className="help-section">
            <h4>Potrebna vam je pomoć?</h4>
            <p>Kontaktirajte naš tim za podršku:</p>
            <ul>
              <li>📞 +381 11 123 4567</li>
              <li>✉️ podrska@ticketmaster.rs</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Clear Cart Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Očisti korpu"
        size="small"
      >
        <div className="clear-modal">
          <p>Da li želite da očistite korpu?</p>
          <p>
            <strong>Sve stavke će biti uklonjene.</strong>
          </p>
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setShowClearModal(false)}>
              Otkaži
            </Button>
            <Button variant="danger" onClick={handleClearCart}>
              Da, očisti korpu
            </Button>
          </div>
        </div>
      </Modal>

      {/* Checkout Modal */}
      <Modal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        title="Kupovina karata"
        size="large"
      >
        <TicketPurchase
          cartItems={cartItems}
          onPurchaseComplete={handlePurchaseComplete}
          onError={handlePurchaseError}
        />
      </Modal>

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="checkout-loading">
          <LoadingSpinner
            size="large"
            message="Obrađujemo vašu narudžbinu..."
          />
        </div>
      )}
    </div>
  );
};

export default CartPage;
