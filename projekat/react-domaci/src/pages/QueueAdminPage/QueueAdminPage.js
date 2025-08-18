// pages/QueueAdminPage/QueueAdminPage.js - KOMPLETNA IMPLEMENTACIJA
import React, { useState, useEffect } from "react";
import apiService from "../../services/api";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";

const QueueAdminPage = () => {
  const [stats, setStats] = useState(null);
  const [maxUsers, setMaxUsers] = useState(100);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await apiService.getAdminQueueStats();
      if (response.success) {
        setStats(response.data);
        setMaxUsers(response.data.max_active_users);
      }
    } catch (error) {
      console.error("Error loading queue stats:", error);
      setError("Greška pri učitavanju statistika");
    }
  };

  const showMessage = (msg, isError = false) => {
    if (isError) {
      setError(msg);
      setMessage("");
    } else {
      setMessage(msg);
      setError("");
    }
    setTimeout(() => {
      setMessage("");
      setError("");
    }, 5000);
  };

  const enableQueue = async () => {
    setLoading(true);
    try {
      const response = await apiService.enableQueue();
      if (response.success) {
        showMessage(response.message);
        await loadStats();
      }
    } catch (error) {
      showMessage("Greška pri aktiviranju queue-a", true);
    } finally {
      setLoading(false);
    }
  };

  const disableQueue = async () => {
    setLoading(true);
    try {
      const response = await apiService.disableQueue();
      if (response.success) {
        showMessage(response.message);
        await loadStats();
      }
    } catch (error) {
      showMessage("Greška pri deaktiviranju queue-a", true);
    } finally {
      setLoading(false);
    }
  };

  const updateMaxUsers = async () => {
    setLoading(true);
    try {
      const response = await apiService.setMaxQueueUsers(maxUsers);
      if (response.success) {
        showMessage(response.message);
        await loadStats();
      }
    } catch (error) {
      showMessage("Greška pri ažuriranju maksimalnog broja korisnika", true);
    } finally {
      setLoading(false);
    }
  };

  const clearWaitingQueue = async () => {
    if (
      !window.confirm(
        "Da li ste sigurni da želite da obrišete sve korisnike iz reda čekanja?"
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.clearWaitingQueue();
      if (response.success) {
        showMessage(response.message);
        await loadStats();
      }
    } catch (error) {
      showMessage("Greška pri brisanju reda čekanja", true);
    } finally {
      setLoading(false);
    }
  };

  const clearExpiredSessions = async () => {
    setLoading(true);
    try {
      const response = await apiService.clearExpiredSessions();
      if (response.success) {
        showMessage(response.message);
        await loadStats();
      }
    } catch (error) {
      showMessage("Greška pri brisanju isteklih sesija", true);
    } finally {
      setLoading(false);
    }
  };

  const activateNextInQueue = async () => {
    setLoading(true);
    try {
      const response = await apiService.activateNextInQueue();
      if (response.success) {
        showMessage(response.message);
        await loadStats();
      }
    } catch (error) {
      showMessage("Greška pri aktiviranju korisnika", true);
    } finally {
      setLoading(false);
    }
  };

  if (!stats) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div>Učitavanje...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1>Queue Management</h1>
        <p>Upravljajte redom čekanja za pristup aplikaciji</p>
      </div>

      {/* Messages */}
      {message && (
        <div
          style={{
            backgroundColor: "#d4edda",
            color: "#155724",
            border: "1px solid #c3e6cb",
            borderRadius: "4px",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: "#f8d7da",
            color: "#721c24",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <div
            style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#007bff" }}
          >
            {stats.total_waiting}
          </div>
          <div>Čeka u redu</div>
        </div>

        <div
          style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <div
            style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#28a745" }}
          >
            {stats.total_active}
          </div>
          <div>Aktivni korisnici</div>
        </div>

        <div
          style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <div
            style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#6c757d" }}
          >
            {stats.total_expired}
          </div>
          <div>Istekle sesije</div>
        </div>

        <div
          style={{
            backgroundColor: stats.queue_enabled ? "#d4edda" : "#f8d7da",
            padding: "1.5rem",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              color: stats.queue_enabled ? "#28a745" : "#dc3545",
            }}
          >
            {stats.queue_enabled ? "UKLJUČEN" : "ISKLJUČEN"}
          </div>
          <div>Status Queue-a</div>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          marginBottom: "2rem",
        }}
      >
        <h3>Kontrole</h3>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "2rem",
            flexWrap: "wrap",
          }}
        >
          <Button
            onClick={enableQueue}
            disabled={loading || stats.queue_enabled}
            variant={stats.queue_enabled ? "outline" : "primary"}
          >
            Uključi Queue
          </Button>

          <Button
            onClick={disableQueue}
            disabled={loading || !stats.queue_enabled}
            variant={!stats.queue_enabled ? "outline" : "danger"}
          >
            Isključi Queue
          </Button>

          <Button
            onClick={activateNextInQueue}
            disabled={loading || stats.total_waiting === 0}
            variant="success"
          >
            Aktiviraj sledeće u redu
          </Button>
        </div>

        {/* Max Users Setting */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "end",
            marginBottom: "2rem",
          }}
        >
          <InputField
            label="Maksimalni broj aktivnih korisnika"
            type="number"
            value={maxUsers}
            onChange={(e) => setMaxUsers(parseInt(e.target.value))}
            min="1"
            max="1000"
            style={{ maxWidth: "200px" }}
          />
          <Button onClick={updateMaxUsers} disabled={loading}>
            Ažuriraj
          </Button>
        </div>

        {/* Cleanup Actions */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Button
            onClick={clearExpiredSessions}
            disabled={loading || stats.total_expired === 0}
            variant="outline"
          >
            Obriši istekle sesije ({stats.total_expired})
          </Button>

          <Button
            onClick={clearWaitingQueue}
            disabled={loading || stats.total_waiting === 0}
            variant="danger-outline"
          >
            Obriši red čekanja ({stats.total_waiting})
          </Button>
        </div>
      </div>

      {/* Additional Stats */}
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <h3>Dodatne statistike</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1rem",
          }}
        >
          <div>
            <strong>Prosečno vreme čekanja:</strong>
            <br />
            <span style={{ fontSize: "1.2rem", color: "#007bff" }}>
              {stats.average_wait_time} minuta
            </span>
          </div>

          <div>
            <strong>Najduže čeka:</strong>
            <br />
            <span style={{ fontSize: "1.2rem", color: "#dc3545" }}>
              {stats.longest_waiting} minuta
            </span>
          </div>

          <div>
            <strong>Maksimalno korisnika:</strong>
            <br />
            <span style={{ fontSize: "1.2rem", color: "#28a745" }}>
              {stats.max_active_users}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueueAdminPage;
