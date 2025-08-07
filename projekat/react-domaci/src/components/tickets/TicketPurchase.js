import React, { useState } from "react";
import Button from "../common/Button";
import InputField from "../common/InputField";
import Modal from "../common/Modal";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api";

const TicketPurchase = ({ cartItems, onPurchaseComplete, onError }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [purchaseData, setPurchaseData] = useState(null);

  const calculateSubtotal = () => {
    return cartItems.reduce(
      (total, item) => total + (parseFloat(item.price) || 0) * item.quantity,
      0
    );
  };

  const calculateDiscount = () => {
    if (!discountApplied) return 0;
    const subtotal = calculateSubtotal();
    return subtotal * (discountApplied.percentage / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;

    try {
      // Simulate discount validation
      const discountResponse = await apiService.validateDiscount(discountCode);
      if (discountResponse.success) {
        setDiscountApplied(discountResponse.data);
      } else {
        alert("Neispravni kod za popust");
      }
    } catch (error) {
      console.error("Discount validation error:", error);
      alert("Greška pri validaciji koda za popust");
    }
  };

  const handlePurchase = async () => {
    setLoading(true);

    try {
      const purchasePromises = cartItems.map(async (item) => {
        const ticketData = {
          event_id: item.event_id,
          quantity: item.quantity,
          discount_percentage: discountApplied?.percentage || 0,
        };

        // Purchase tickets one by one (or in batches)
        const purchases = [];
        for (let i = 0; i < item.quantity; i++) {
          const response = await apiService.purchaseTicket({
            event_id: item.event_id,
            discount_percentage: discountApplied?.percentage || 0,
          });

          if (response.success) {
            purchases.push(response.data);
          } else {
            throw new Error(
              `Failed to purchase ticket for ${item.title}: ${response.message}`
            );
          }
        }

        return {
          event: item,
          tickets: purchases,
        };
      });

      const results = await Promise.all(purchasePromises);

      setPurchaseData({
        purchases: results,
        total: calculateTotal(),
        discount: calculateDiscount(),
        user: user,
      });

      setShowConfirmation(true);
      onPurchaseComplete(results);
    } catch (error) {
      console.error("Purchase error:", error);
      onError(error.message || "Greška pri kupovini karata");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("sr-RS").format(price);
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <h3>Pregled kupovine</h3>

      {/* Cart items summary */}
      <div style={{ marginBottom: "2rem" }}>
        {cartItems.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <div>
              <strong>{item.title}</strong>
              <div style={{ fontSize: "0.875rem", color: "#666" }}>
                {item.quantity} x {formatPrice(item.price)} RSD
              </div>
            </div>
            <div style={{ fontWeight: "bold" }}>
              {formatPrice(item.price * item.quantity)} RSD
            </div>
          </div>
        ))}
      </div>

      {/* Discount code */}
      <div style={{ marginBottom: "2rem" }}>
        <h4>Kod za popust</h4>
        <div style={{ display: "flex", gap: "1rem" }}>
          <InputField
            placeholder="Unesite kod za popust"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button
            variant="outline"
            onClick={handleApplyDiscount}
            disabled={!discountCode.trim()}
          >
            Primeni
          </Button>
        </div>

        {discountApplied && (
          <div
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem",
              backgroundColor: "#d4edda",
              border: "1px solid #c3e6cb",
              borderRadius: "4px",
              color: "#155724",
            }}
          >
            ✅ Popust od {discountApplied.percentage}% je primenjen
          </div>
        )}
      </div>

      {/* Price breakdown */}
      <div
        style={{
          padding: "1rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "4px",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
          }}
        >
          <span>Ukupno:</span>
          <span>{formatPrice(calculateSubtotal())} RSD</span>
        </div>

        {discountApplied && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.5rem",
              color: "#28a745",
            }}
          >
            <span>Popust ({discountApplied.percentage}%):</span>
            <span>-{formatPrice(calculateDiscount())} RSD</span>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "1.2rem",
            fontWeight: "bold",
            paddingTop: "0.5rem",
            borderTop: "1px solid #dee2e6",
          }}
        >
          <span>Za plaćanje:</span>
          <span>{formatPrice(calculateTotal())} RSD</span>
        </div>
      </div>

      {/* Purchase button */}
      <Button
        size="large"
        onClick={handlePurchase}
        disabled={loading || cartItems.length === 0}
        style={{ width: "100%" }}
      >
        {loading
          ? "Obrađuje se..."
          : `Kupi karte - ${formatPrice(calculateTotal())} RSD`}
      </Button>

      {/* Purchase confirmation modal */}
      <Modal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        title="Uspešna kupovina!"
        size="large"
      >
        {purchaseData && (
          <PurchaseConfirmation
            purchaseData={purchaseData}
            onClose={() => setShowConfirmation(false)}
          />
        )}
      </Modal>
    </div>
  );
};

// Purchase confirmation component
const PurchaseConfirmation = ({ purchaseData, onClose }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat("sr-RS").format(price);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
        <h2>Karte su uspešno kupljene!</h2>
        <p>
          Vaše karte su poslate na email adresu:{" "}
          <strong>{purchaseData.user.email}</strong>
        </p>
      </div>

      <div
        style={{
          backgroundColor: "#f8f9fa",
          padding: "1.5rem",
          borderRadius: "8px",
          marginBottom: "2rem",
        }}
      >
        <h3>Detalji kupovine</h3>

        {purchaseData.purchases.map((purchase, index) => (
          <div key={index} style={{ marginBottom: "1rem" }}>
            <strong>{purchase.event.title}</strong>
            <div style={{ fontSize: "0.875rem", color: "#666" }}>
              {purchase.tickets.length} karta(e)
            </div>
            <div style={{ fontSize: "0.875rem" }}>
              Brojevi karata:{" "}
              {purchase.tickets.map((t) => t.ticket_number).join(", ")}
            </div>
          </div>
        ))}

        <div
          style={{
            paddingTop: "1rem",
            borderTop: "1px solid #dee2e6",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "1.1rem",
            fontWeight: "bold",
          }}
        >
          <span>Ukupno plaćeno:</span>
          <span>{formatPrice(purchaseData.total)} RSD</span>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <Button onClick={onClose} size="large">
          Zatvori
        </Button>
      </div>
    </div>
  );
};

export default TicketPurchase;
