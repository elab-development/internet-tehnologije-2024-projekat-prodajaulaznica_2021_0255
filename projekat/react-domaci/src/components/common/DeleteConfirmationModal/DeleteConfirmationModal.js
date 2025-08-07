import React, { useState } from "react";
import Modal from "../Modal";
import Button from "../Button";
import InputField from "../InputField";

const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Potvrdi brisanje",
  message,
  itemName,
  requireConfirmation = false,
  confirmationText = "OBRIŠI",
  isDangerous = true,
  additionalInfo = null,
}) => {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (requireConfirmation && confirmationInput !== confirmationText) {
      return;
    }

    setLoading(true);
    try {
      await onConfirm();
      setConfirmationInput("");
      onClose();
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmationInput("");
    onClose();
  };

  const isConfirmationValid =
    !requireConfirmation || confirmationInput === confirmationText;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="medium">
      <div style={{ padding: "1rem 0" }}>
        {/* Warning icon */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "1.5rem",
            fontSize: "3rem",
          }}
        >
          ⚠️
        </div>

        {/* Main message */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
            {message || "Da li ste sigurni da želite da obrišete:"}
          </p>

          {itemName && (
            <p
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
                color: isDangerous ? "#e53e3e" : "#333",
                marginBottom: "0.5rem",
              }}
            >
              "{itemName}"
            </p>
          )}
        </div>

        {/* Additional information */}
        {additionalInfo && (
          <div
            style={{
              backgroundColor: "#fff3cd",
              border: "1px solid #ffeaa7",
              borderRadius: "4px",
              padding: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            {additionalInfo}
          </div>
        )}

        {/* Danger warning */}
        {isDangerous && (
          <div
            style={{
              backgroundColor: "#f8d7da",
              border: "1px solid #f5c6cb",
              borderRadius: "4px",
              padding: "1rem",
              marginBottom: "1.5rem",
              color: "#721c24",
            }}
          >
            <strong>⚠️ Upozorenje:</strong> Ova akcija se ne može poništiti.
            {requireConfirmation && (
              <span> Molimo unesite "{confirmationText}" da potvrdite.</span>
            )}
          </div>
        )}

        {/* Confirmation input */}
        {requireConfirmation && (
          <div style={{ marginBottom: "1.5rem" }}>
            <InputField
              label={`Unesite "${confirmationText}" da potvrdite:`}
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={confirmationText}
              style={{
                fontFamily: "monospace",
                textAlign: "center",
              }}
            />
          </div>
        )}

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            marginTop: "2rem",
          }}
        >
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={!isConfirmationValid || loading}
            size="large"
          >
            {loading ? "Brisanje..." : "Da, obriši"}
          </Button>

          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            size="large"
          >
            Otkaži
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmationModal;
