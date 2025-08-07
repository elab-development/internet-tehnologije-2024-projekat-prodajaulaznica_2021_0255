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
        setQrCodeData(response.data);
      } else {
        setError("Greška pri učitavanju QR koda");
      }
    } catch (err) {
      setError(err.message || "Greška pri učitavanju QR koda");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = () => {
    if (qrCodeData?.qr_code_url) {
      const link = document.createElement("a");
      link.href = qrCodeData.qr_code_url;
      link.download = `ticket-qr-${ticket.ticket_number}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await apiService.generateTicketPDF(ticket.id);

      if (response.success) {
        // Generate PDF on frontend using the ticket data
        generatePDFFromData(response.data);
      }
    } catch (err) {
      alert("Greška pri generisanju PDF-a: " + err.message);
    }
  };

  const generatePDFFromData = (ticketData) => {
    // Simple HTML-based PDF generation
    const printWindow = window.open("", "_blank");
    const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Karta - ${ticketData.ticket_number}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        max-width: 600px; 
                        margin: 0 auto; 
                        padding: 20px;
                        background: white;
                    }
                    .ticket {
                        border: 2px solid #333;
                        border-radius: 10px;
                        padding: 20px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        margin-bottom: 20px;
                    }
                    .ticket-header {
                        text-align: center;
                        border-bottom: 1px solid rgba(255,255,255,0.3);
                        padding-bottom: 15px;
                        margin-bottom: 15px;
                    }
                    .ticket-number {
                        font-size: 24px;
                        font-weight: bold;
                        letter-spacing: 2px;
                        margin-bottom: 10px;
                    }
                    .event-info {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        margin-bottom: 20px;
                    }
                    .info-item {
                        margin-bottom: 10px;
                    }
                    .info-label {
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .qr-section {
                        text-align: center;
                        background: white;
                        color: #333;
                        padding: 20px;
                        border-radius: 8px;
                        margin-top: 20px;
                    }
                    .qr-code {
                        max-width: 200px;
                        height: auto;
                        margin: 10px 0;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        font-size: 12px;
                        color: #666;
                    }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="ticket">
                    <div class="ticket-header">
                        <div class="ticket-number">${ticketData.ticket_number}</div>
                        <div>ELEKTRONSKA KARTA</div>
                    </div>
                    
                    <div class="event-info">
                        <div class="info-item">
                            <div class="info-label">DOGAĐAJ:</div>
                            <div>${ticketData.event.name}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">KATEGORIJA:</div>
                            <div>${ticketData.event.category}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">DATUM:</div>
                            <div>${ticketData.event.date}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">VREME:</div>
                            <div>${ticketData.event.time}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">LOKACIJA:</div>
                            <div>${ticketData.event.location}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">CENA:</div>
                            <div>${ticketData.price} RSD</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">VLASNIK:</div>
                            <div>${ticketData.user.name}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">EMAIL:</div>
                            <div>${ticketData.user.email}</div>
                        </div>
                    </div>
                </div>
                
                <div class="qr-section">
                    <div style="font-weight: bold; margin-bottom: 10px;">
                        POKAŽITE OVAJ KOD NA ULAZU
                    </div>
                    <img src="${qrCodeData?.qr_code_url}" alt="QR Code" class="qr-code" />
                    <div style="font-size: 12px; margin-top: 10px;">
                        Skenirajte QR kod ili pokažite broj karte: ${ticketData.ticket_number}
                    </div>
                </div>
                
                <div class="footer">
                    <div>Karta kupljena: ${ticketData.purchase_date}</div>
                    <div>Status: ${ticketData.status}</div>
                    <div style="margin-top: 10px;">
                        <strong>NAPOMENE:</strong><br>
                        • Karta je važeća samo sa važećim ličnim dokumentom<br>
                        • Zabranjeno je fotografisanje i snimanje bez dozvole<br>
                        • Organizator zadržava pravo promene programa
                    </div>
                </div>
                
                <div class="no-print" style="text-align: center; margin-top: 30px;">
                    <button onclick="window.print()" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-right: 10px;
                    ">Štampaj</button>
                    <button onclick="window.close()" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                    ">Zatvori</button>
                </div>
            </body>
            </html>
        `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
            {error}
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
              }}
            >
              <h4>{ticket.event?.name}</h4>
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
                border: "2px dashed #dee2e6",
                borderRadius: "8px",
                padding: "2rem",
                marginBottom: "2rem",
              }}
            >
              <div style={{ marginBottom: "1rem", fontWeight: "bold" }}>
                POKAŽITE OVAJ KOD NA ULAZU
              </div>

              <img
                src={qrCodeData.qr_code_url}
                alt="QR Code"
                style={{
                  maxWidth: "250px",
                  height: "auto",
                  border: "1px solid #dee2e6",
                }}
              />

              <div
                style={{
                  fontSize: "0.875rem",
                  color: "#6c757d",
                  marginTop: "1rem",
                }}
              >
                Skenirajte QR kod ili pokažite broj karte
              </div>
            </div>

            {/* Action buttons */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Button variant="outline" onClick={handleDownloadQR}>
                📥 Preuzmi QR kod
              </Button>

              <Button variant="outline" onClick={handleDownloadPDF}>
                📄 Preuzmi PDF
              </Button>

              <Button onClick={onClose}>Zatvori</Button>
            </div>

            {/* Instructions */}
            <div
              style={{
                backgroundColor: "#d1ecf1",
                border: "1px solid #bee5eb",
                borderRadius: "4px",
                padding: "1rem",
                marginTop: "2rem",
                fontSize: "0.875rem",
              }}
            >
              <strong>Napomene:</strong>
              <ul
                style={{
                  margin: "0.5rem 0",
                  paddingLeft: "1.5rem",
                  textAlign: "left",
                }}
              >
                <li>Sačuvajte QR kod na telefonu ili štampajte kartu</li>
                <li>QR kod je jedinstven za vašu kartu</li>
                <li>Pokažite kod na ulazu u događaj</li>
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
