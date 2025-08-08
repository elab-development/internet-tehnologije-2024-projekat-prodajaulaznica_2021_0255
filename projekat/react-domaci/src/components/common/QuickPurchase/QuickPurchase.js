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
  disabled = false, // Dodao external disabled prop
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showPurchaseFlow, setShowPurchaseFlow] = useState(false);

  // Debug log
  console.log("QuickPurchase event:", event);
  console.log("Available tickets:", event.availableTickets);
  console.log("Can purchase:", event.can_purchase);

  const handlePurchaseClick = (e) => {
    e.stopPropagation(); // Prevent event card click

    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    // Poboljšana logika za proveru dostupnosti
    if (!canPurchaseTickets()) {
      return;
    }

    setShowPurchaseFlow(true);
  };

  const handlePurchaseSuccess = (tickets) => {
    setShowPurchaseFlow(false);
    // Show success message or redirect
    alert(`Uspešno ste kupili ${tickets.length} karta(e)!`);
  };

  // Poboljšana funkcija za proveru da li se mogu kupiti karte
  const canPurchaseTickets = () => {
    // Ako je external disabled prop true
    if (disabled) return false;

    // Proveri available_tickets (različite varijante)
    const availableTickets =
      event.availableTickets || event.available_tickets || 0;

    // Ako nema dostupnih karata
    if (availableTickets <= 0) return false;

    // Proveri status događaja
    if (event.status && event.status !== "active") return false;

    // Proveri datum događaja (ne može se kupiti karta za prošli događaj)
    if (event.date || event.start_date) {
      const eventDate = new Date(event.date || event.start_date);
      const now = new Date();
      if (eventDate < now) return false;
    }

    // Ako postoji can_purchase, koristi ga
    if (typeof event.can_purchase === "boolean") {
      return event.can_purchase;
    }

    // Default: može se kupiti
    return true;
  };

  const isDisabled = !canPurchaseTickets();

  // Određuj tekst dugmeta
  const getButtonText = () => {
    if (disabled) return "Nedostupno";

    const availableTickets =
      event.availableTickets || event.available_tickets || 0;

    if (availableTickets <= 0) return "Rasprodato";

    if (event.status && event.status !== "active") return "Neaktivno";

    // Proveri datum
    if (event.date || event.start_date) {
      const eventDate = new Date(event.date || event.start_date);
      const now = new Date();
      if (eventDate < now) return "Završeno";
    }

    return buttonText;
  };

  return (
    <>
      <Button
        variant={isDisabled ? "secondary" : variant}
        size={size}
        onClick={handlePurchaseClick}
        disabled={isDisabled}
        style={{
          width: "100%",
          opacity: isDisabled ? 0.6 : 1,
          cursor: isDisabled ? "not-allowed" : "pointer",
        }}
      >
        {getButtonText()}
      </Button>

      {showPurchaseFlow && (
        <TicketPurchaseFlow
          event={event}
          isOpen={showPurchaseFlow}
          onClose={() => setShowPurchaseFlow(false)}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </>
  );
};

export default QuickPurchase;
