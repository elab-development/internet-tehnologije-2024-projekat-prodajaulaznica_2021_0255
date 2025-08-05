import React, { useState, useEffect } from "react";
import EventCard from "../../components/common/EventCard";
import Button from "../../components/common/Button";
import { apiService } from "../../services/api";

const HomePage = () => {
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadFeaturedEvents = async () => {
      try {
        setLoading(true);
        const response = await apiService.getFeaturedEvents();
        setFeaturedEvents(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedEvents();
  }, []);

  if (loading) {
    return <div className="loading">Učitavanje popularnih događaja...</div>;
  }

  if (error) {
    return <div className="error">Greška: {error}</div>;
  }

  return (
    <div>
      <div
        className="hero-section"
        style={{ textAlign: "center", marginBottom: "3rem" }}
      >
        <h1>Dobrodošli na TicketMaster Pro! 🎫</h1>
        <p style={{ fontSize: "1.2rem", color: "#666", marginBottom: "2rem" }}>
          Pronađite i kupite karte za najbolje događaje u gradu
        </p>
        <Button size="large" onClick={() => (window.location.href = "/events")}>
          Pogledaj sve događaje
        </Button>
      </div>

      <section>
        <h2>🌟 Popularni događaji</h2>
        <div className="events-grid">
          {featuredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
