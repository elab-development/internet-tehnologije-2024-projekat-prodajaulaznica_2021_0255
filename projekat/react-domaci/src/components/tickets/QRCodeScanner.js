import React, { useState, useRef, useEffect } from "react";
import Button from "../common/Button";
import Modal from "../common/Modal";

const QRCodeScanner = ({ isOpen, onClose, onScan }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [demoMode, setDemoMode] = useState(false);
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

      // Try to access camera, but don't fail if not available
      try {
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
      } catch (cameraError) {
        // If camera access fails, enable demo mode
        console.log("Camera not available, enabling demo mode");
        setDemoMode(true);
      }

      // In a real implementation, you would use a QR code library here
      // like jsQR or qr-scanner to detect QR codes from the video stream
    } catch (err) {
      console.log("Scanner error:", err.message);
      setDemoMode(true);
      setScanning(true); // Keep scanning true for demo
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
    setDemoMode(false);
  };

  const simulateValidScan = () => {
    // Generate demo QR data for VALID ticket - will be handled locally
    const mockQRData = {
      ticket_number: "TKT-DEMO-VALID",
      event_id: 1,
      event_name: "Demo Koncert 2024",
      event_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      location: "Demo Arena, Beograd",
      user_id: 1,
      user_name: "Demo Korisnik",
      generated_at: new Date().toISOString(),
      demo_type: "valid",
    };

    onScan(JSON.stringify(mockQRData));
    setError("");
    setTimeout(() => onClose(), 1000);
  };

  const simulateUsedScan = () => {
    // Generate demo QR data for USED ticket - will be handled locally
    const mockQRData = {
      ticket_number: "TKT-DEMO-USED",
      event_id: 1,
      event_name: "Demo Koncert 2024",
      event_date: new Date().toISOString(),
      location: "Demo Arena, Beograd",
      user_id: 1,
      user_name: "Demo Korisnik",
      generated_at: new Date().toISOString(),
      demo_type: "used",
    };

    onScan(JSON.stringify(mockQRData));
    setError("");
    setTimeout(() => onClose(), 1000);
  };

  const simulateInvalidScan = () => {
    // Generate demo QR data for INVALID ticket - will be handled locally
    const mockQRData = {
      ticket_number: "TKT-DEMO-INVALID",
      event_id: 999,
      event_name: "Nepostojeci Događaj",
      user_name: "Nepoznat Korisnik",
      demo_type: "invalid",
    };

    onScan(JSON.stringify(mockQRData));
    setError("");
    setTimeout(() => onClose(), 1000);
  };

  const simulateCancelledScan = () => {
    // Generate demo QR data for CANCELLED ticket - will be handled locally
    const mockQRData = {
      ticket_number: "TKT-DEMO-CANCELLED",
      event_id: 1,
      event_name: "Demo Koncert 2024",
      event_date: new Date().toISOString(),
      location: "Demo Arena, Beograd",
      user_id: 1,
      user_name: "Demo Korisnik",
      generated_at: new Date().toISOString(),
      demo_type: "cancelled",
    };

    onScan(JSON.stringify(mockQRData));
    setError("");
    setTimeout(() => onClose(), 1000);
  };

  const simulateExpiredScan = () => {
    // Generate demo QR data for EXPIRED ticket - will be handled locally
    const mockQRData = {
      ticket_number: "TKT-DEMO-EXPIRED",
      event_id: 1,
      event_name: "Demo Koncert 2024",
      event_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      location: "Demo Arena, Beograd",
      user_id: 1,
      user_name: "Demo Korisnik",
      generated_at: new Date().toISOString(),
      demo_type: "expired",
    };

    onScan(JSON.stringify(mockQRData));
    setError("");
    setTimeout(() => onClose(), 1000);
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
            backgroundColor: demoMode ? "#f8f9fa" : "#000",
            borderRadius: "8px",
            overflow: "hidden",
            marginBottom: "1rem",
            minHeight: "300px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {!demoMode ? (
            <>
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
            </>
          ) : (
            <div style={{ textAlign: "center", color: "#6c757d" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📱</div>
              <p>Demo režim - kamera nije dostupna</p>
              <p style={{ fontSize: "0.875rem" }}>
                Koristite demo dugmad ispod za testiranje različitih scenarija
              </p>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <p>
            {demoMode
              ? "Demo režim - testirajte različite scenarije validacije"
              : "Usmerite kameru na QR kod karte"}
          </p>
          {scanning && !demoMode && (
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

        {/* Demo buttons - organized in grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <Button
            variant="primary"
            size="small"
            onClick={simulateValidScan}
            disabled={!scanning}
            style={{
              backgroundColor: "#28a745",
              borderColor: "#28a745",
            }}
          >
            ✅ Validna karta
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={simulateUsedScan}
            disabled={!scanning}
            style={{
              borderColor: "#6c757d",
              color: "#6c757d",
            }}
          >
            🎫 Iskorišćena
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={simulateInvalidScan}
            disabled={!scanning}
            style={{
              borderColor: "#dc3545",
              color: "#dc3545",
            }}
          >
            ❌ Nevalidna
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={simulateCancelledScan}
            disabled={!scanning}
            style={{
              borderColor: "#ffc107",
              color: "#ffc107",
            }}
          >
            🚫 Otkazana
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={simulateExpiredScan}
            disabled={!scanning}
            style={{
              borderColor: "#fd7e14",
              color: "#fd7e14",
            }}
          >
            ⏰ Istekla
          </Button>
        </div>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Button variant="outline" onClick={onClose}>
            Zatvori skener
          </Button>
        </div>

        <div
          style={{
            backgroundColor: "#e7f3ff",
            border: "1px solid #b3d9ff",
            borderRadius: "4px",
            padding: "1rem",
            marginTop: "1rem",
            fontSize: "0.875rem",
            textAlign: "left",
          }}
        >
          <strong>🎭 Demo scenariji (obrađuju se lokalno):</strong>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.5rem",
              marginTop: "0.5rem",
              fontSize: "0.8rem",
            }}
          >
            <div>
              ✅ <strong>Validna:</strong> Aktivna karta spremna za korišćenje
            </div>
            <div>
              🎫 <strong>Iskorišćena:</strong> Karta je već validirana
            </div>
            <div>
              ❌ <strong>Nevalidna:</strong> Karta ne postoji u sistemu
            </div>
            <div>
              🚫 <strong>Otkazana:</strong> Karta je otkazana od strane
              korisnika
            </div>
            <div>
              ⏰ <strong>Istekla:</strong> Događaj je već završen
            </div>
          </div>
          <div
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem",
              backgroundColor: "#d4edda",
              borderRadius: "4px",
              fontSize: "0.75rem",
            }}
          >
            💡 <strong>Napomena:</strong> Svi demo podaci se prepoznaju po
            "TKT-DEMO-" prefiksu i obrađuju se lokalno bez slanja na server. U
            produkciji bi se koristila biblioteka poput jsQR za stvarno
            skeniranje QR kodova.
          </div>
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
