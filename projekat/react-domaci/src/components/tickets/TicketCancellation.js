import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import Modal from "../common/Modal";
import InputField from "../common/InputField";
import apiService from "../../services/api";

const TicketCancellation = ({ ticket, isOpen, onClose, onSuccess }) => {
  const [cancellationInfo, setCancellationInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [step, setStep] = useState(1); // 1: info, 2: reason, 3: confirmation

  useEffect(() => {
    if (isOpen && ticket) {
      loadCancellationInfo();
    }
  }, [isOpen, ticket]);

  const loadCancellationInfo = async () => {
    try {
      // Koristi istu logiku kao u UserTicketsDashboard
      const now = new Date();
      const eventStart = new Date(ticket.event?.start_date);
      const canCancel = ticket.status === "active" && eventStart > now;

      if (canCancel) {
        // Izračunaj sate do događaja
        const hoursUntilEvent = Math.floor(
          (eventStart - now) / (1000 * 60 * 60)
        );

        // Izračunaj naknadu na osnovu vremena
        let cancellationFeePercentage = 10;
        let refundPercentage = 90;

        if (hoursUntilEvent >= 168) {
          // 7+ dana
          cancellationFeePercentage = 5;
          refundPercentage = 95;
        } else if (hoursUntilEvent >= 72) {
          // 3-7 dana
          cancellationFeePercentage = 10;
          refundPercentage = 90;
        } else if (hoursUntilEvent >= 24) {
          // 1-3 dana
          cancellationFeePercentage = 20;
          refundPercentage = 80;
        } else {
          // Manje od 24h
          cancellationFeePercentage = 100;
          refundPercentage = 0;
        }

        setCancellationInfo({
          can_cancel: hoursUntilEvent >= 24, // Mora biti bar 24h unapred
          hours_until_event: hoursUntilEvent,
          cancellation_fee_percentage: cancellationFeePercentage,
          refund_percentage: refundPercentage,
          estimated_refund: ticket.price * (refundPercentage / 100),
          cancellation_fee: ticket.price * (cancellationFeePercentage / 100),
        });
      } else {
        setCancellationInfo({
          can_cancel: false,
          reason:
            ticket.status !== "active"
              ? `Ticket status is: ${ticket.status}`
              : "Event has already started",
        });
      }
    } catch (err) {
      setError("Greška pri učitavanju informacija o otkazivanju");
    }
  };

  const handleCancel = async () => {
    if (!reason.trim()) {
      setError("Molimo unesite razlog otkazivanja");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiService.cancelTicket(ticket.id, {
        reason: reason,
      });

      if (response.success) {
        onSuccess(response.data);
        handleClose();
      } else {
        setError(response.message || "Greška pri otkazivanju karte");
      }
    } catch (err) {
      setError(err.message || "Greška pri otkazivanju karte");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setReason("");
    setError("");
    setCancellationInfo(null);
    onClose();
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("sr-RS").format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("sr-RS", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!ticket) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Otkazivanje karte"
      size="medium"
    >
      <div style={{ padding: "1rem" }}>
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

        {/* Step 1: Cancellation Information */}
        {step === 1 && (
          <div>
            <h4>Informacije o otkazivanju</h4>

            <div
              style={{
                backgroundColor: "#f8f9fa",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "1.5rem",
              }}
            >
              <h5>{ticket.event?.name}</h5>
              <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                <div>📅 {formatDate(ticket.event?.start_date)}</div>
                <div>🎫 {ticket.ticket_number}</div>
                <div>💰 {formatPrice(ticket.price)} RSD</div>
              </div>
            </div>

            {cancellationInfo && (
              <>
                {cancellationInfo.can_cancel ? (
                  <div>
                    <div
                      style={{
                        backgroundColor: "#fff3cd",
                        border: "1px solid #ffeaa7",
                        borderRadius: "4px",
                        padding: "1rem",
                        marginBottom: "1rem",
                      }}
                    >
                      <h6>Uslovi otkazivanja:</h6>
                      <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem" }}>
                        <li>
                          Vreme do događaja:{" "}
                          {cancellationInfo.hours_until_event} sati
                        </li>
                        <li>
                          Naknada za otkazivanje:{" "}
                          {cancellationInfo.cancellation_fee_percentage}%
                        </li>
                        <li>
                          Procenat povraćaja:{" "}
                          {cancellationInfo.refund_percentage}%
                        </li>
                      </ul>
                    </div>

                    <div
                      style={{
                        backgroundColor: "#d4edda",
                        border: "1px solid #c3e6cb",
                        borderRadius: "4px",
                        padding: "1rem",
                        marginBottom: "1.5rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span>Originalna cena:</span>
                        <span>{formatPrice(ticket.price)} RSD</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span>Naknada za otkazivanje:</span>
                        <span style={{ color: "#dc3545" }}>
                          -{formatPrice(cancellationInfo.cancellation_fee)} RSD
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "1.1rem",
                          fontWeight: "bold",
                          paddingTop: "0.5rem",
                          borderTop: "1px solid #c3e6cb",
                        }}
                      >
                        <span>Povraćaj sredstava:</span>
                        <span style={{ color: "#28a745" }}>
                          {formatPrice(cancellationInfo.estimated_refund)} RSD
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <Button
                        onClick={() => setStep(2)}
                        style={{ marginRight: "1rem" }}
                      >
                        Nastavi sa otkazivanjem
                      </Button>
                      <Button variant="outline" onClick={handleClose}>
                        Odustani
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        backgroundColor: "#f8d7da",
                        border: "1px solid #f5c6cb",
                        borderRadius: "4px",
                        padding: "1rem",
                        marginBottom: "1rem",
                        textAlign: "center",
                      }}
                    >
                      <h6>Karta se ne može otkazati</h6>
                      <p>{cancellationInfo.reason}</p>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <Button variant="outline" onClick={handleClose}>
                        Zatvori
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 2: Cancellation Reason */}
        {step === 2 && (
          <div>
            <h4>Razlog otkazivanja</h4>
            <p style={{ marginBottom: "1rem", color: "#6c757d" }}>
              Molimo unesite razlog otkazivanja karte (opcionalno):
            </p>

            <InputField
              type="textarea"
              placeholder="Razlog otkazivanja..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />

            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
                marginTop: "1.5rem",
              }}
            >
              <Button onClick={() => setStep(3)}>Nastavi</Button>
              <Button variant="outline" onClick={() => setStep(1)}>
                Nazad
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Final Confirmation */}
        {step === 3 && (
          <div>
            <h4>Potvrda otkazivanja</h4>

            <div
              style={{
                backgroundColor: "#f8d7da",
                border: "1px solid #f5c6cb",
                borderRadius: "4px",
                padding: "1rem",
                marginBottom: "1rem",
                textAlign: "center",
              }}
            >
              <strong>⚠️ Upozorenje</strong>
              <p style={{ margin: "0.5rem 0 0 0" }}>
                Ova akcija se ne može poništiti. Karta će biti trajno otkazana.
              </p>
            </div>

            {cancellationInfo && (
              <div
                style={{
                  backgroundColor: "#f8f9fa",
                  padding: "1rem",
                  borderRadius: "4px",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Povraćaj sredstava:</span>
                  <strong>
                    {formatPrice(cancellationInfo.estimated_refund)} RSD
                  </strong>
                </div>
              </div>
            )}

            {reason && (
              <div style={{ marginBottom: "1rem" }}>
                <strong>Razlog:</strong>
                <div
                  style={{
                    backgroundColor: "#f8f9fa",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    marginTop: "0.5rem",
                    fontStyle: "italic",
                  }}
                >
                  {reason}
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
                marginTop: "1.5rem",
              }}
            >
              <Button
                variant="danger"
                onClick={handleCancel}
                disabled={loading}
              >
                {loading ? "Otkazivanje..." : "Potvrdi otkazivanje"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                disabled={loading}
              >
                Nazad
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TicketCancellation;
