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
        const response = await apiService.getFeaturedEvents();

        if (response.success) {
          setFeaturedEvents(response.data || []);
        } else {
          setError("Greška pri učitavanju događaja");
        }
      } catch (err) {
        setError(err.message || "Greška pri učitavanju događaja");
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedEvents();
  }, []);

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
        {featuredEvents.length > 0 ? (
          <div
            className="events-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1.5rem",
              marginTop: "1rem",
            }}
          >
            {featuredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
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
