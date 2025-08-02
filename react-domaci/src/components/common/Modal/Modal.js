import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import Button from "../Button";
import "./Modal.css";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  size = "medium", // small, medium, large, full
  className = "",
}) => {
  // Effect za ESC key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Effect za body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // Handler za klik na overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal-container modal-${size} ${className}`}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && <h2 className="modal-title">{title}</h2>}
            {showCloseButton && (
              <Button
                variant="outline"
                size="small"
                onClick={onClose}
                className="modal-close-btn"
                aria-label="Zatvori modal"
              >
                ✕
              </Button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );

  // Renderujemo modal u portal
  return ReactDOM.createPortal(modalContent, document.body);
};

export default Modal;
