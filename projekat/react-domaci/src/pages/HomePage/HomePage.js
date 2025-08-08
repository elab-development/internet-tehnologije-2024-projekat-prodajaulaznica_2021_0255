import React, { useState, useEffect } from "react";
import EventCard from "../../components/common/EventCard";
import Button from "../../components/common/Button";
import apiService from "../../services/api";

const HomePage = () => {
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadFeaturedEvents = async () => {
      try {
        setLoading(true);
        console.log("🔄 Pozivam getFeaturedEvents...");

        const response = await apiService.getFeaturedEvents();
        console.log("📦 Raw response:", response);

        let eventsArray = [];

        // Pokušajmo da izvučemo niz iz različitih struktura
        if (response?.success && Array.isArray(response?.data)) {
          eventsArray = response.data;
        } else if (Array.isArray(response?.data)) {
          eventsArray = response.data;
        } else if (Array.isArray(response)) {
          eventsArray = response;
        } else if (response?.data?.data && Array.isArray(response.data.data)) {
          // Možda je struktura response.data.data
          eventsArray = response.data.data;
        } else if (
          response?.data &&
          typeof response.data === "object" &&
          response.data.data
        ) {
          // Ili možda response.data.data
          eventsArray = Array.isArray(response.data.data)
            ? response.data.data
            : [];
        } else {
          console.log("❌ Unexpected response format:", response);
          eventsArray = [];
        }

        console.log("✅ Final eventsArray:", eventsArray);
        console.log("✅ Is array:", Array.isArray(eventsArray));

        setFeaturedEvents(eventsArray);

        if (eventsArray.length === 0) {
          setError("Nema dostupnih popularnih događaja");
        }
      } catch (err) {
        console.error("❌ Featured events error:", err);
        setError(err.message || "Greška pri učitavanju događaja");
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedEvents();
  }, []);

  console.log("🎯 Current featuredEvents state:", featuredEvents);
  console.log("🎯 Is featuredEvents array:", Array.isArray(featuredEvents));

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div>Učitavanje popularnih događaja...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div style={{ color: "red" }}>{error}</div>
        <Button onClick={() => window.location.reload()}>Pokušaj ponovo</Button>
      </div>
    );
  }

  return (
    <div>
      <section
        className="hero-section"
        style={{ textAlign: "center", padding: "3rem" }}
      >
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
          Dobrodošli na TicketMaster!
        </h1>
        <p style={{ fontSize: "1.2rem", color: "#666", marginBottom: "2rem" }}>
          Pronađite i kupite karte za najbolje događaje u gradu
        </p>
        <Button size="large" onClick={() => (window.location.href = "/events")}>
          Pogledaj sve događaje
        </Button>
      </section>

      <section style={{ padding: "2rem" }}>
        <h2>Popularni događaji</h2>

        {/* Bezbedna provera za niz */}
        {Array.isArray(featuredEvents) && featuredEvents.length > 0 ? (
          <div
            className="events-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1.5rem",
              marginTop: "1rem",
            }}
          >
            {featuredEvents.map((event, index) => {
              console.log(`🎪 Rendering event ${index}:`, event);
              return <EventCard key={event.id || index} event={event} />;
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
            <p>Trenutno nema popularnih događaja.</p>
            <Button onClick={() => (window.location.href = "/events")}>
              Pogledaj sve događaje
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
