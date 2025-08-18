// components/common/QueueInterface/QueueInterface.js - POPRAVLJENA VERZIJA
import React, { useEffect } from "react";
import { useQueue } from "../../../context/QueueContext";
import Button from "../Button";

const QueueInterface = ({ onAccessGranted }) => {
  const { queueStatus, loading, error, joinQueue, leaveQueue } = useQueue();

  // Automatski pozovi onAccessGranted kada korisnik dobije pristup
  useEffect(() => {
    if (queueStatus.can_access && queueStatus.status === "active") {
      console.log("Access granted from QueueInterface");
      onAccessGranted();
    }
  }, [queueStatus.can_access, queueStatus.status, onAccessGranted]);

  // Ako je queue sistem neaktivan, automatski dozvoliti pristup
  if (queueStatus.status === "not_in_queue" && queueStatus.can_access) {
    onAccessGranted();
    return null;
  }

  if (queueStatus.status === "waiting") {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          maxWidth: "500px",
          margin: "0 auto",
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⏳</div>
        <h2>Trenutno ste u redu čekanja</h2>

        <div
          style={{
            backgroundColor: "#f8f9fa",
            padding: "2rem",
            borderRadius: "8px",
            margin: "2rem 0",
          }}
        >
          <div
            style={{
              fontSize: "3rem",
              fontWeight: "bold",
              color: "#007bff",
              marginBottom: "0.5rem",
            }}
          >
            #{queueStatus.position}
          </div>
          <p>Vaša pozicija u redu</p>

          <div style={{ marginTop: "1rem" }}>
            <strong>Procenjeno vreme čekanja:</strong>
            <br />
            <span style={{ fontSize: "1.2rem", color: "#28a745" }}>
              {queueStatus.estimated_wait_time} minuta
            </span>
          </div>

          <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#666" }}>
            <p>Aktivni korisnici: {queueStatus.total_active}</p>
            <p>U redu čekanja: {queueStatus.total_waiting}</p>
          </div>
        </div>

        <Button variant="outline" onClick={leaveQueue}>
          Napusti red čekanja
        </Button>
      </div>
    );
  }

  // Default interface za pridruživanje redu
  return (
    <div
      style={{
        textAlign: "center",
        padding: "3rem",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        maxWidth: "400px",
        margin: "0 auto",
      }}
    >
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎫</div>
      <h2>Dobrodošli!</h2>
      <p>Kliknite da se pridružite redu za kupovinu karata.</p>

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

      <Button onClick={joinQueue} disabled={loading}>
        {loading ? "Pridruživanje..." : "Pridruži se redu"}
      </Button>
    </div>
  );
};

export default QueueInterface;
