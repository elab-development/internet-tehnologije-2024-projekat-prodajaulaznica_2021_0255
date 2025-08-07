import React, { useState, useRef, useEffect } from "react";
import Button from "../common/Button";
import Modal from "../common/Modal";

const QRCodeScanner = ({ isOpen, onClose, onScan }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError("");
      setScanning(true);

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // In a real implementation, you would use a QR code library here
      // like jsQR or qr-scanner to detect QR codes from the video stream
    } catch (err) {
      setError("Greška pri pristupanju kameri: " + err.message);
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const simulateScan = () => {
    // Simulate QR code scan for demo purposes
    const mockQRData = {
      ticket_number: "TKT-DEMO123",
      event_id: 1,
      event_name: "Demo događaj",
      user_name: "Demo korisnik",
    };

    onScan(JSON.stringify(mockQRData));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="QR kod skener" size="large">
      <div style={{ padding: "1rem", textAlign: "center" }}>
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
          </div>
        )}

        <div
          style={{
            position: "relative",
            backgroundColor: "#000",
            borderRadius: "8px",
            overflow: "hidden",
            marginBottom: "1rem",
          }}
        >
          <video
            ref={videoRef}
            style={{
              width: "100%",
              maxWidth: "500px",
              height: "auto",
            }}
            playsInline
            muted
          />

          {/* QR code detection overlay */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "200px",
              height: "200px",
              border: "2px solid #fff",
              borderRadius: "8px",
              pointerEvents: "none",
            }}
          />

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <p>Usmerite kameru na QR kod karte</p>
          {scanning && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#28a745",
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#28a745",
                  borderRadius: "50%",
                  animation: "pulse 1s infinite",
                }}
              />
              Skeniranje aktivno...
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Button variant="outline" onClick={simulateScan} disabled={!scanning}>
            Demo sken
          </Button>
          <Button variant="outline" onClick={onClose}>
            Zatvori
          </Button>
        </div>

        <div
          style={{
            backgroundColor: "#d1ecf1",
            border: "1px solid #bee5eb",
            borderRadius: "4px",
            padding: "1rem",
            marginTop: "1rem",
            fontSize: "0.875rem",
          }}
        >
          <strong>Napomena:</strong> Ovo je demo implementacija QR skenera. U
          stvarnoj aplikaciji bi se koristila biblioteka poput jsQR ili
          qr-scanner za detekciju QR kodova iz video toka.
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </Modal>
  );
};

export default QRCodeScanner;
