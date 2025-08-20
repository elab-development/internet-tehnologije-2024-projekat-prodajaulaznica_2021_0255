import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import apiService from "../../services/api";

const QRCodeDisplay = ({ ticket, isOpen, onClose }) => {
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && ticket) {
      loadQRCode();
    }
  }, [isOpen, ticket]);

  const loadQRCode = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiService.getTicketQRCode(ticket.id);

      if (response.success) {
        console.log("CELA RESPONSE:", response); // DEBUG
        console.log("QR SVG TIP:", typeof response.data.qr_code_svg); // DEBUG
        console.log("QR SVG SADRŽAJ:", response.data.qr_code_svg); // DEBUG
        console.log("QR SVG DUŽINA:", response.data.qr_code_svg?.length); // DEBUG
        setQrCodeData(response.data);
      } else {
        setError("Greška pri učitavanju QR koda");
      }
    } catch (err) {
      console.error("QR Code Error:", err);
      setError(err.message || "Greška pri učitavanju QR koda");
    } finally {
      setLoading(false);
    }
  };

  const testDirectSVG = () => {
    const testSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="white" stroke="black" stroke-width="2"/>
      <rect x="20" y="20" width="20" height="20" fill="black"/>
      <rect x="60" y="20" width="20" height="20" fill="black"/>
      <rect x="100" y="20" width="20" height="20" fill="black"/>
      <rect x="140" y="20" width="20" height="20" fill="black"/>
      <rect x="20" y="60" width="20" height="20" fill="black"/>
      <rect x="140" y="60" width="20" height="20" fill="black"/>
      <rect x="20" y="100" width="20" height="20" fill="black"/>
      <rect x="60" y="100" width="20" height="20" fill="black"/>
      <rect x="100" y="100" width="20" height="20" fill="black"/>
      <rect x="140" y="100" width="20" height="20" fill="black"/>
      <rect x="20" y="140" width="20" height="20" fill="black"/>
      <rect x="140" y="140" width="20" height="20" fill="black"/>
      <text x="100" y="180" text-anchor="middle" fill="black" font-size="12">TEST QR</text>
    </svg>`;

    console.log("TEST SVG:", testSVG);
    setQrCodeData({ qr_code_svg: testSVG });
  };

  const handleDownloadQR = () => {
    if (!qrCodeData?.qr_code_svg) {
      alert("QR kod nije dostupan za preuzimanje");
      return;
    }

    try {
      // Kreiranje SVG fajla za download
      const svgBlob = new Blob([qrCodeData.qr_code_svg], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `qr-code-${ticket.ticket_number}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Greška pri preuzimanju: " + err.message);
    }
  };

  const handlePrintQR = () => {
    if (!qrCodeData?.qr_code_svg) {
      alert("QR kod nije dostupan za štampanje");
      return;
    }

    try {
      const printWindow = window.open("", "_blank");

      printWindow.document.write(`
        <html>
          <head>
            <title>QR kod - ${ticket?.ticket_number}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 2rem;
                margin: 0;
              }
              .qr-container { 
                border: 2px dashed #333; 
                padding: 2rem; 
                margin: 2rem auto;
                max-width: 400px;
                background: white;
              }
              .ticket-info {
                margin-bottom: 2rem;
                font-size: 14px;
                line-height: 1.6;
              }
              @media print {
                body { margin: 0; padding: 1rem; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <h2>Elektronska karta</h2>
            <div class="ticket-info">
              <strong>Broj karte:</strong> ${ticket?.ticket_number}<br>
              <strong>Događaj:</strong> ${ticket?.event?.name}<br>
              <strong>Datum:</strong> ${formatDate(
                ticket?.event?.start_date
              )}<br>
              <strong>Lokacija:</strong> ${ticket?.event?.location}
            </div>
            <div class="qr-container">
              ${qrCodeData.qr_code_svg}
            </div>
            <p><strong>Pokažite ovaj QR kod na ulazu</strong></p>
            <div class="no-print" style="margin-top: 2rem;">
              <button onclick="window.print()" style="
                background: #007bff; color: white; border: none; 
                padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;
              ">Štampaj</button>
              <button onclick="window.close()" style="
                background: #6c757d; color: white; border: none; 
                padding: 10px 20px; border-radius: 5px; cursor: pointer;
              ">Zatvori</button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      alert("Greška pri štampanju: " + err.message);
    }
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

  // SIGURNA FUNKCIJA ZA PROVERU STRINGA
  const isValidString = (value) => {
    return value && typeof value === "string" && value.length > 0;
  };

  const getStringValue = (value) => {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") return JSON.stringify(value);
    return String(value || "");
  };

  if (!ticket) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="QR kod karte" size="medium">
      <div style={{ padding: "1rem", textAlign: "center" }}>
        {loading && (
          <div style={{ padding: "2rem" }}>
            <LoadingSpinner />
            <p>Učitavanje QR koda...</p>
          </div>
        )}

        {error && (
          <div
            style={{
              color: "#dc3545",
              backgroundColor: "#f8d7da",
              border: "1px solid #f5c6cb",
              borderRadius: "4px",
              padding: "1rem",
              marginBottom: "1rem",
            }}
          >
            ⚠️ {error}
            <Button
              variant="outline"
              size="small"
              onClick={loadQRCode}
              style={{ marginLeft: "1rem" }}
            >
              Pokušaj ponovo
            </Button>
          </div>
        )}

        {qrCodeData && !loading && (
          <div>
            {/* Ticket info */}
            <div
              style={{
                backgroundColor: "#f8f9fa",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "2rem",
                textAlign: "left",
              }}
            >
              <h4 style={{ textAlign: "center", marginBottom: "1rem" }}>
                📋 {ticket.event?.name}
              </h4>
              <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                <div>📅 {formatDate(ticket.event?.start_date)}</div>
                <div>📍 {ticket.event?.location}</div>
                <div>🎫 {ticket.ticket_number}</div>
              </div>
            </div>

            {/* QR Code */}
            <div
              style={{
                backgroundColor: "white",
                border: "3px dashed #dee2e6",
                borderRadius: "12px",
                padding: "2rem",
                marginBottom: "2rem",
              }}
            >
              <div style={{ marginBottom: "1rem", fontWeight: "bold" }}>
                📱 POKAŽITE OVAJ KOD NA ULAZU
              </div>

              {/* QR Code Display sa sigurnim proverama */}
              {qrCodeData.qr_code_svg ? (
                <div>
                  {isValidString(qrCodeData.qr_code_svg) ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        minHeight: "250px",
                        border: "1px solid #eee",
                        borderRadius: "8px",
                        backgroundColor: "#fff",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: qrCodeData.qr_code_svg,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        minHeight: "250px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid red",
                        borderRadius: "8px",
                        color: "red",
                        flexDirection: "column",
                        padding: "1rem",
                      }}
                    >
                      <div>
                        <strong>GREŠKA: QR kod nije valjan string!</strong>
                      </div>
                      <div>Tip: {typeof qrCodeData.qr_code_svg}</div>
                      <div>
                        Vrednost:{" "}
                        {getStringValue(qrCodeData.qr_code_svg).substring(
                          0,
                          100
                        )}
                        ...
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    minHeight: "250px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px dashed #ccc",
                    borderRadius: "8px",
                    color: "#666",
                  }}
                >
                  QR kod nije dostupan (prazan)
                </div>
              )}

              <div
                style={{
                  fontSize: "0.875rem",
                  color: "#6c757d",
                  marginTop: "1rem",
                }}
              >
                Broj karte: <strong>{ticket.ticket_number}</strong>
              </div>
            </div>

            {/* Action buttons */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
                flexWrap: "wrap",
                marginBottom: "2rem",
              }}
            >
              <Button variant="outline" onClick={handleDownloadQR}>
                📥 Preuzmi SVG
              </Button>

              <Button variant="outline" onClick={handlePrintQR}>
                🖨️ Štampaj
              </Button>

              <Button onClick={onClose}>Zatvori</Button>
            </div>

            {/* Instructions */}
            <div
              style={{
                backgroundColor: "#e3f2fd",
                border: "1px solid #2196f3",
                borderRadius: "8px",
                padding: "1rem",
                fontSize: "0.875rem",
                textAlign: "left",
              }}
            >
              <strong>💡 Napomene:</strong>
              <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem" }}>
                <li>QR kod sadrži sve podatke o vašoj karti</li>
                <li>Pokažite kod na ulazu - može se skenirati sa ekrana</li>
                <li>Ponesitе važeći lični dokument</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QRCodeDisplay;
