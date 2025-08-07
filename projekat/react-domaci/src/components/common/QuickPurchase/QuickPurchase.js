import React, { useState } from "react";
import Button from "../Button";
import TicketPurchaseFlow from "../../tickets/TicketPurchaseFlow";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const QuickPurchase = ({
  event,
  buttonText = "Kupi karte",
  variant = "primary",
  size = "medium",
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showPurchaseFlow, setShowPurchaseFlow] = useState(false);

  const handlePurchaseClick = (e) => {
    e.stopPropagation(); // Prevent event card click

    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    if (!event.can_purchase || event.available_tickets === 0) {
      return;
    }

    setShowPurchaseFlow(true);
  };

  const handlePurchaseSuccess = (tickets) => {
    setShowPurchaseFlow(false);
    // Show success message or redirect
    alert(`Uspešno ste kupili ${tickets.length} karta(e)!`);
  };

  const isDisabled = !event.can_purchase || event.available_tickets === 0;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handlePurchaseClick}
        disabled={isDisabled}
        style={{ width: "100%" }}
      >
        {isDisabled ? "Rasprodato" : buttonText}
      </Button>

      <TicketPurchaseFlow
        event={event}
        isOpen={showPurchaseFlow}
        onClose={() => setShowPurchaseFlow(false)}
        onSuccess={handlePurchaseSuccess}
      />
    </>
  );
};

export default QuickPurchase;
