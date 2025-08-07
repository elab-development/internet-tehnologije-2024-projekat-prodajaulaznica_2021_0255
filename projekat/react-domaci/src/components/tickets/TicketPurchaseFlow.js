import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import InputField from "../common/InputField";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api";

const TicketPurchaseFlow = ({ event, isOpen, onClose, onSuccess }) => {
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState(1); // 1: quantity, 2: details, 3: payment, 4: confirmation
  const [purchaseData, setPurchaseData] = useState({
    quantity: 1,
    discountCode: "",
    discountApplied: null,
    customerInfo: {
      name: user?.name || "",
      email: user?.email || "",
      phone: "",
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [purchaseResult, setPurchaseResult] = useState(null);

  useEffect(() => {
    if (user) {
      setPurchaseData((prev) => ({
        ...prev,
        customerInfo: {
          ...prev.customerInfo,
          name: user.name || "",
          email: user.email || "",
        },
      }));
    }
  }, [user]);

  const calculatePrice = () => {
    const basePrice = parseFloat(event?.price || 0) * purchaseData.quantity;
    const discount = purchaseData.discountApplied
      ? basePrice * (purchaseData.discountApplied.percentage / 100)
      : 0;
    return basePrice - discount;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("sr-RS").format(price);
  };

  const handleQuantityChange = (quantity) => {
    setPurchaseData((prev) => ({
      ...prev,
      quantity: Math.min(Math.max(1, quantity), event?.available_tickets || 1),
    }));
  };

  const handleApplyDiscount = async () => {
    if (!purchaseData.discountCode.trim()) return;

    setLoading(true);
    try {
      const response = await apiService.validateDiscount(
        purchaseData.discountCode
      );
      if (response.success) {
        setPurchaseData((prev) => ({
          ...prev,
          discountApplied: response.data,
        }));
        setError("");
      } else {
        setError("Neispravni kod za popust");
      }
    } catch (err) {
      setError("Greška pri validaciji koda za popust");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDiscount = () => {
    setPurchaseData((prev) => ({
      ...prev,
      discountCode: "",
      discountApplied: null,
    }));
  };

  const validateStep = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        return (
          purchaseData.quantity > 0 &&
          purchaseData.quantity <= (event?.available_tickets || 0)
        );
      case 2:
        return (
          purchaseData.customerInfo.name.trim() &&
          purchaseData.customerInfo.email.trim() &&
          /\S+@\S+\.\S+/.test(purchaseData.customerInfo.email)
        );
      case 3:
        return true; // Payment validation would go here
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
      setError("");
    } else {
      setError("Molimo popunite sva obavezna polja");
    }
  };

  const handlePreviousStep = () => {
    setStep((prev) => prev - 1);
    setError("");
  };

  const handlePurchase = async () => {
    if (!isAuthenticated()) {
      setError("Morate biti prijavljeni da biste kupili karte");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const purchases = [];

      // Purchase tickets one by one
      for (let i = 0; i < purchaseData.quantity; i++) {
        const response = await apiService.purchaseTicket({
          event_id: event.id,
          discount_percentage: purchaseData.discountApplied?.percentage || 0,
        });

        if (response.success) {
          purchases.push(response.data);
        } else {
          throw new Error(response.message || "Greška pri kupovini karte");
        }
      }

      setPurchaseResult({
        tickets: purchases,
        event: event,
        totalPaid: calculatePrice(),
        discount: purchaseData.discountApplied,
        customerInfo: purchaseData.customerInfo,
      });

      setStep(4);
      onSuccess && onSuccess(purchases);
    } catch (err) {
      setError(err.message || "Greška pri kupovini karata");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setPurchaseData({
      quantity: 1,
      discountCode: "",
      discountApplied: null,
      customerInfo: {
        name: user?.name || "",
        email: user?.email || "",
        phone: "",
      },
    });
    setError("");
    setPurchaseResult(null);
    onClose();
  };

  if (!event) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Kupovina karata - ${event.name}`}
      size="large"
    >
      <div style={{ padding: "1rem" }}>
        {/* Progress indicator */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "2rem",
          }}
        >
          {[1, 2, 3, 4].map((stepNum) => (
            <div
              key={stepNum}
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  backgroundColor: stepNum <= step ? "#007bff" : "#dee2e6",
                  color: stepNum <= step ? "white" : "#6c757d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                }}
              >
                {stepNum}
              </div>
              {stepNum < 4 && (
                <div
                  style={{
                    width: "50px",
                    height: "2px",
                    backgroundColor: stepNum < step ? "#007bff" : "#dee2e6",
                    margin: "0 0.5rem",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div
            style={{
              color: "#dc3545",
              backgroundColor: "#f8d7da",
              border: "1px solid #f5c6cb",
              borderRadius: "4px",
              padding: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Step 1: Quantity Selection */}
        {step === 1 && (
          <QuantityStep
            event={event}
            quantity={purchaseData.quantity}
            onQuantityChange={handleQuantityChange}
            discountCode={purchaseData.discountCode}
            discountApplied={purchaseData.discountApplied}
            onDiscountCodeChange={(code) =>
              setPurchaseData((prev) => ({ ...prev, discountCode: code }))
            }
            onApplyDiscount={handleApplyDiscount}
            onRemoveDiscount={handleRemoveDiscount}
            calculatePrice={calculatePrice}
            formatPrice={formatPrice}
            loading={loading}
          />
        )}

        {/* Step 2: Customer Details */}
        {step === 2 && (
          <CustomerDetailsStep
            customerInfo={purchaseData.customerInfo}
            onCustomerInfoChange={(info) =>
              setPurchaseData((prev) => ({ ...prev, customerInfo: info }))
            }
            isAuthenticated={isAuthenticated()}
          />
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <PaymentStep
            event={event}
            purchaseData={purchaseData}
            calculatePrice={calculatePrice}
            formatPrice={formatPrice}
            onPurchase={handlePurchase}
            loading={loading}
          />
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && purchaseResult && (
          <ConfirmationStep
            purchaseResult={purchaseResult}
            formatPrice={formatPrice}
            onClose={handleClose}
          />
        )}

        {/* Navigation buttons */}
        {step < 4 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "2rem",
              paddingTop: "1rem",
              borderTop: "1px solid #dee2e6",
            }}
          >
            <Button
              variant="outline"
              onClick={step === 1 ? handleClose : handlePreviousStep}
            >
              {step === 1 ? "Otkaži" : "Nazad"}
            </Button>

            {step < 3 && (
              <Button onClick={handleNextStep} disabled={!validateStep(step)}>
                Dalje
              </Button>
            )}

            {step === 3 && (
              <Button
                onClick={handlePurchase}
                disabled={loading || !validateStep(step)}
              >
                {loading
                  ? "Obrađuje se..."
                  : `Kupi - ${formatPrice(calculatePrice())} RSD`}
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

// Quantity selection step
const QuantityStep = ({
  event,
  quantity,
  onQuantityChange,
  discountCode,
  discountApplied,
  onDiscountCodeChange,
  onApplyDiscount,
  onRemoveDiscount,
  calculatePrice,
  formatPrice,
  loading,
}) => (
  <div>
    <h3>Izaberite broj karata</h3>

    <div
      style={{
        backgroundColor: "#f8f9fa",
        padding: "1rem",
        borderRadius: "8px",
        marginBottom: "2rem",
      }}
    >
      <h4>{event.name}</h4>
      <p>
        <strong>Lokacija:</strong> {event.location}
      </p>
      <p>
        <strong>Datum:</strong>{" "}
        {new Date(event.start_date).toLocaleDateString("sr-RS")}
      </p>
      <p>
        <strong>Vreme:</strong>{" "}
        {new Date(event.start_date).toLocaleTimeString("sr-RS", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
      <p>
        <strong>Cena po karti:</strong> {formatPrice(event.price)} RSD
      </p>
      <p>
        <strong>Dostupno karata:</strong> {event.available_tickets}
      </p>
    </div>

    <div style={{ marginBottom: "2rem" }}>
      <label
        style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}
      >
        Broj karata:
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <Button
          variant="outline"
          onClick={() => onQuantityChange(quantity - 1)}
          disabled={quantity <= 1}
        >
          -
        </Button>
        <span
          style={{
            fontSize: "1.2rem",
            fontWeight: "bold",
            minWidth: "30px",
            textAlign: "center",
          }}
        >
          {quantity}
        </span>
        <Button
          variant="outline"
          onClick={() => onQuantityChange(quantity + 1)}
          disabled={quantity >= event.available_tickets}
        >
          +
        </Button>
      </div>
    </div>

    {/* Discount code section */}
    <div style={{ marginBottom: "2rem" }}>
      <h4>Kod za popust (opcionalno)</h4>
      {!discountApplied ? (
        <div style={{ display: "flex", gap: "1rem" }}>
          <InputField
            placeholder="Unesite kod za popust"
            value={discountCode}
            onChange={(e) => onDiscountCodeChange(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button
            variant="outline"
            onClick={onApplyDiscount}
            disabled={!discountCode.trim() || loading}
          >
            Primeni
          </Button>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "#d4edda",
            border: "1px solid #c3e6cb",
            borderRadius: "4px",
            padding: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: "#155724" }}>
            ✅ Popust od {discountApplied.percentage}% je primenjen
          </span>
          <Button variant="outline" size="small" onClick={onRemoveDiscount}>
            Ukloni
          </Button>
        </div>
      )}
    </div>

    {/* Price summary */}
    <div
      style={{
        backgroundColor: "#f8f9fa",
        padding: "1rem",
        borderRadius: "8px",
        border: "1px solid #dee2e6",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "0.5rem",
        }}
      >
        <span>
          {quantity} x {formatPrice(event.price)} RSD
        </span>
        <span>{formatPrice(event.price * quantity)} RSD</span>
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
          <span>Popust ({discountApplied.percentage}%)</span>
          <span>
            -
            {formatPrice(
              (event.price * quantity * discountApplied.percentage) / 100
            )}{" "}
            RSD
          </span>
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
        <span>Ukupno:</span>
        <span>{formatPrice(calculatePrice())} RSD</span>
      </div>
    </div>
  </div>
);

// Customer details step
const CustomerDetailsStep = ({
  customerInfo,
  onCustomerInfoChange,
  isAuthenticated,
}) => (
  <div>
    <h3>Podaci o kupcu</h3>

    {!isAuthenticated && (
      <div
        style={{
          backgroundColor: "#fff3cd",
          border: "1px solid #ffeaa7",
          borderRadius: "4px",
          padding: "1rem",
          marginBottom: "2rem",
        }}
      >
        <strong>Napomena:</strong> Prijavite se da automatski popunite vaše
        podatke.
      </div>
    )}

    <div style={{ display: "grid", gap: "1rem" }}>
      <InputField
        label="Ime i prezime *"
        value={customerInfo.name}
        onChange={(e) =>
          onCustomerInfoChange({ ...customerInfo, name: e.target.value })
        }
        required
      />

      <InputField
        label="Email adresa *"
        type="email"
        value={customerInfo.email}
        onChange={(e) =>
          onCustomerInfoChange({ ...customerInfo, email: e.target.value })
        }
        required
      />

      <InputField
        label="Broj telefona"
        type="tel"
        value={customerInfo.phone}
        onChange={(e) =>
          onCustomerInfoChange({ ...customerInfo, phone: e.target.value })
        }
      />
    </div>

    <p style={{ fontSize: "0.875rem", color: "#6c757d", marginTop: "1rem" }}>
      Karte će biti poslate na vašu email adresu.
    </p>
  </div>
);

// Payment step
const PaymentStep = ({
  event,
  purchaseData,
  calculatePrice,
  formatPrice,
  onPurchase,
  loading,
}) => (
  <div>
    <h3>Potvrda kupovine</h3>

    <div
      style={{
        backgroundColor: "#f8f9fa",
        padding: "1.5rem",
        borderRadius: "8px",
        marginBottom: "2rem",
      }}
    >
      <h4>Pregled narudžbine</h4>
      <div style={{ marginBottom: "1rem" }}>
        <strong>{event.name}</strong>
        <div>{purchaseData.quantity} karta(e)</div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <strong>Podaci o kupcu:</strong>
        <div>{purchaseData.customerInfo.name}</div>
        <div>{purchaseData.customerInfo.email}</div>
      </div>

      <div
        style={{
          paddingTop: "1rem",
          borderTop: "1px solid #dee2e6",
          fontSize: "1.2rem",
          fontWeight: "bold",
        }}
      >
        Ukupno za plaćanje: {formatPrice(calculatePrice())} RSD
      </div>
    </div>

    <div
      style={{
        backgroundColor: "#d1ecf1",
        border: "1px solid #bee5eb",
        borderRadius: "4px",
        padding: "1rem",
      }}
    >
      <strong>Napomena:</strong> Ovo je demo verzija. U stvarnoj aplikaciji ovde
      bi bio integrisan sistem za plaćanje.
    </div>
  </div>
);

// Confirmation step
const ConfirmationStep = ({ purchaseResult, formatPrice, onClose }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
    <h2>Uspešna kupovina!</h2>
    <p style={{ fontSize: "1.1rem", marginBottom: "2rem" }}>
      Vaše karte su uspešno kupljene i poslate na email adresu.
    </p>

    <div
      style={{
        backgroundColor: "#f8f9fa",
        padding: "1.5rem",
        borderRadius: "8px",
        marginBottom: "2rem",
        textAlign: "left",
      }}
    >
      <h4>Detalji kupovine</h4>
      <div style={{ marginBottom: "1rem" }}>
        <strong>Događaj:</strong> {purchaseResult.event.name}
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <strong>Broj karata:</strong> {purchaseResult.tickets.length}
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <strong>Brojevi karata:</strong>
        <div style={{ fontSize: "0.875rem", fontFamily: "monospace" }}>
          {purchaseResult.tickets
            .map((ticket) => ticket.ticket_number)
            .join(", ")}
        </div>
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <strong>Ukupno plaćeno:</strong> {formatPrice(purchaseResult.totalPaid)}{" "}
        RSD
      </div>
      <div>
        <strong>Email:</strong> {purchaseResult.customerInfo.email}
      </div>
    </div>

    <Button onClick={onClose} size="large">
      Zatvori
    </Button>
  </div>
);

export default TicketPurchaseFlow;
