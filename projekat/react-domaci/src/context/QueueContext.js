// context/QueueContext.js - POPRAVLJENA VERZIJA
import React, { createContext, useContext, useState, useEffect } from "react";
import apiService from "../services/api";

const QueueContext = createContext();

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error("useQueue must be used within QueueProvider");
  }
  return context;
};

export const QueueProvider = ({ children }) => {
  const [queueStatus, setQueueStatus] = useState({
    status: "unknown",
    can_access: false, // ← Početno false!
    position: 0,
    estimated_wait_time: 0,
    total_waiting: 0,
    total_active: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkQueueStatus = async () => {
    try {
      setLoading(true);
      console.log("Checking queue status...");

      const response = await apiService.checkQueueStatus();
      console.log("Queue status response:", response);

      if (response && response.success) {
        setQueueStatus(response.data);
      } else {
        // Ako nema queue entry, pokušaj da se pridružiš
        console.log("No queue entry found, trying to join...");
        await joinQueue();
      }
    } catch (err) {
      console.error("Queue check error:", err);
      setError("Greška pri proveri queue statusa");

      // NE DOZVOLJAVAJ PRISTUP AUTOMATSKI!
      // Umesto toga, pokušaj da se pridružiš queue-u
      await joinQueue();
    } finally {
      setLoading(false);
    }
  };

  const joinQueue = async () => {
    try {
      setLoading(true);
      console.log("Joining queue...");

      const response = await apiService.joinQueue();
      console.log("Queue join response:", response);

      if (response && response.success) {
        setQueueStatus(response.data);
        setError(""); // Clear any previous errors
      } else {
        setError("Greška pri pridruživanju queue-u");
      }
    } catch (err) {
      console.error("Queue join error:", err);
      setError("Greška pri pridruživanju queue-u");

      // Postavi status na čekanje umesto dozvoljavanja pristupa
      setQueueStatus({
        status: "error",
        can_access: false,
        position: 0,
        estimated_wait_time: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const leaveQueue = async () => {
    try {
      await apiService.leaveQueue();
      setQueueStatus({
        status: "not_in_queue",
        can_access: false,
        position: 0,
        estimated_wait_time: 0,
      });
    } catch (err) {
      console.error("Queue leave error:", err);
      setError("Greška pri napuštanju queue-a");
    }
  };

  // Auto-refresh queue status
  useEffect(() => {
    if (queueStatus.status === "waiting") {
      const interval = setInterval(checkQueueStatus, 3000); // Check every 3 seconds
      return () => clearInterval(interval);
    }
  }, [queueStatus.status]);

  const value = {
    queueStatus,
    loading,
    error,
    checkQueueStatus,
    joinQueue,
    leaveQueue,
    setError,
  };

  return (
    <QueueContext.Provider value={value}>{children}</QueueContext.Provider>
  );
};
