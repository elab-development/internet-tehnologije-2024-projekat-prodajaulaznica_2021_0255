// components/admin/QueueAdminPanel.js
import React, { useState, useEffect } from "react";
import { queueService } from "../../services/queueService";
import Button from "../common/Button";
import InputField from "../common/InputField";

const QueueAdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [maxUsers, setMaxUsers] = useState(100);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await queueService.getStats();
      if (response.success) {
        setStats(response.data);
        setMaxUsers(response.data.max_active_users);
      }
    } catch (error) {
      console.error("Error loading queue stats:", error);
    }
  };

  const enableQueue = async () => {
    setLoading(true);
    try {
      await queueService.enableQueue();
      await loadStats();
    } catch (error) {
      console.error("Error enabling queue:", error);
    } finally {
      setLoading(false);
    }
  };

  const disableQueue = async () => {
    setLoading(true);
    try {
      await queueService.disableQueue();
      await loadStats();
    } catch (error) {
      console.error("Error disabling queue:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateMaxUsers = async () => {
    setLoading(true);
    try {
      await queueService.setMaxUsers(maxUsers);
      await loadStats();
    } catch (error) {
      console.error("Error updating max users:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!stats) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <h2>Queue Management</h2>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            backgroundColor: "#f8f9fa",
            padding: "1rem",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div
            style={{ fontSize: "2rem", fontWeight: "bold", color: "#007bff" }}
          >
            {stats.total_waiting}
          </div>
          <div>Waiting</div>
        </div>

        <div
          style={{
            backgroundColor: "#d4edda",
            padding: "1rem",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div
            style={{ fontSize: "2rem", fontWeight: "bold", color: "#28a745" }}
          >
            {stats.total_active}
          </div>
          <div>Active</div>
        </div>

        <div
          style={{
            backgroundColor: stats.queue_enabled ? "#d4edda" : "#f8d7da",
            padding: "1rem",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: stats.queue_enabled ? "#28a745" : "#dc3545",
            }}
          >
            {stats.queue_enabled ? "ON" : "OFF"}
          </div>
          <div>Queue Status</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        <Button
          onClick={enableQueue}
          disabled={loading || stats.queue_enabled}
          variant={stats.queue_enabled ? "outline" : "primary"}
        >
          Enable Queue
        </Button>
        <Button
          onClick={disableQueue}
          disabled={loading || !stats.queue_enabled}
          variant={!stats.queue_enabled ? "outline" : "danger"}
        >
          Disable Queue
        </Button>
      </div>

      {/* Max Users Setting */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "end" }}>
        <InputField
          label="Max Active Users"
          type="number"
          value={maxUsers}
          onChange={(e) => setMaxUsers(parseInt(e.target.value))}
          min="1"
          max="1000"
        />
        <Button onClick={updateMaxUsers} disabled={loading}>
          Update
        </Button>
      </div>
    </div>
  );
};

export default QueueAdminPanel;
