import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import Modal from "../../components/common/Modal";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useCart } from "../../context/CartContext";
import "./CartPage.css";

const CartPage = () => {
  const navigate = useNavigate();
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
  } = useCart();

  // State za checkout process
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

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

  const handleCheckout = async () => {
    setIsCheckingOut(true);

    // Simuliramo checkout process
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setShowCheckoutModal(true);
      clearCart();
    } catch (error) {
      alert("Greška pri obradi narudžbine. Pokušajte ponovo.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCheckoutSuccess = () => {
    setShowCheckoutModal(false);
    navigate("/");
  };

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Vaša korpa je prazna</h2>
          <p>Izgleda da niste dodali nijednu kartu u korpu.</p>
          <Button onClick={() => navigate("/events")} size="large">
            🎫 Pogledaj događaje
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1>🛒 Vaša korpa</h1>
        <div className="cart-summary">
          <span className="total-items">{getTotalItems()} stavki</span>
          <span className="total-price">
            {formatPrice(getTotalPrice())} RSD
          </span>
        </div>
      </div>

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
              🗑️ Očisti korpu
            </Button>
          </div>

          <div className="cart-items-list">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="item-image">
                  <img src={item.image} alt={item.title} />
                </div>

                <div className="item-details">
                  <h3 className="item-title">{item.title}</h3>

                  <div className="item-info">
                    <div className="info-row">
                      <span className="icon">📅</span>
                      <span>
                        {formatDate(item.date)} u {item.time}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="icon">📍</span>
                      <span>{item.location}</span>
                    </div>
                  </div>

                  <div className="item-price">
                    <span className="single-price">
                      {formatPrice(item.price)} RSD po karti
                    </span>
                  </div>
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
                    🗑️ Ukloni
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cart-sidebar">
          <div className="order-summary">
            <h3>📋 Pregled narudžbine</h3>

            <div className="summary-row">
              <span>Ukupno stavki:</span>
              <span>{getTotalItems()}</span>
            </div>

            <div className="summary-row">
              <span>Ukupno karte:</span>
              <span>{getTotalItems()}</span>
            </div>

            <div className="summary-row total">
              <strong>
                <span>Ukupno za plaćanje:</span>
                <span>{formatPrice(getTotalPrice())} RSD</span>
              </strong>
            </div>

            <div className="checkout-actions">
              <Button
                size="large"
                onClick={handleCheckout}
                disabled={isCheckingOut}
                loading={isCheckingOut}
                className="checkout-btn"
              >
                {isCheckingOut ? "Obrađuje se..." : "💳 Završi kupovinu"}
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/events")}
                className="continue-shopping-btn"
              >
                ← Nastavi kupovinu
              </Button>
            </div>
          </div>

          <div className="help-section">
            <h4>💡 Potrebna vam je pomoć?</h4>
            <p>Kontaktirajte naš tim za podršku:</p>
            <ul>
              <li>📞 +381 11 123 4567</li>
              <li>📧 podrska@ticketmaster.rs</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Clear Cart Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="🗑️ Očisti korpu"
        size="small"
      >
        <div className="clear-modal">
          <p>Da li ste sigurni da želite da očistite korpu?</p>
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

      {/* Checkout Success Modal */}
      <Modal
        isOpen={showCheckoutModal}
        onClose={handleCheckoutSuccess}
        title="✅ Uspešna kupovina!"
        size="medium"
        closeOnOverlayClick={false}
        closeOnEscape={false}
      >
        <div className="success-modal">
          <div className="success-icon">🎉</div>
          <h3>Vaša narudžbina je uspešno obrađena!</h3>
          <p>Karte će vam biti poslate na email adresu u najkraćem roku.</p>
          <p>
            <strong>Broj narudžbine:</strong> #TM{Date.now()}
          </p>
          <div className="modal-actions">
            <Button onClick={handleCheckoutSuccess} size="large">
              🏠 Vrati se na početnu
            </Button>
          </div>
        </div>
      </Modal>

      {/* Loading Overlay */}
      {isCheckingOut && (
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
