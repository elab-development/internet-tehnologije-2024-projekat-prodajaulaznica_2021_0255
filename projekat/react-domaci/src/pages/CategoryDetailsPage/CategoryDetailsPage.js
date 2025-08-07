import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EventCard from "../../components/common/EventCard";
import Button from "../../components/common/Button";
import Pagination from "../../components/common/Pagination";
import apiService from "../../services/api";

const CategoryDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(null);
  const [events, setEvents] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const loadCategoryData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load category events
        const eventsResponse = await apiService.getCategoryEvents(
          id,
          currentPage
        );

        if (eventsResponse.success) {
          setCategory(eventsResponse.data.category);
          setEvents(eventsResponse.data.events.data || []);
          setTotalPages(eventsResponse.data.events.last_page || 1);
        }

        // Load category statistics
        const statsResponse = await apiService.getCategoryStatistics(id);
        if (statsResponse.success) {
          setStatistics(statsResponse.data.statistics);
        }
      } catch (err) {
        setError(err.message || "Greška pri učitavanju kategorije");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadCategoryData();
    }
  }, [id, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div>Učitavanje kategorije...</div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div style={{ color: "red" }}>
          {error || "Kategorija nije pronađena"}
        </div>
        <Button onClick={() => navigate("/categories")}>
          ← Nazad na kategorije
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      {/* Category header */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "2rem",
          marginBottom: "2rem",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          border: `3px solid ${category.color}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              backgroundColor: category.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "2rem",
              fontWeight: "bold",
            }}
          >
            {category.name.charAt(0).toUpperCase()}
          </div>

          <div>
            <h1 style={{ margin: 0, color: "#333" }}>{category.name}</h1>
            <p
              style={{
                margin: "0.5rem 0 0 0",
                color: "#666",
                fontSize: "1.1rem",
              }}
            >
              {category.description}
            </p>
          </div>
        </div>

        {/* Statistics */}
        {statistics && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "1rem",
              marginTop: "1.5rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid #eee",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: category.color,
                }}
              >
                {statistics.active_events}
              </div>
              <div style={{ color: "#666", fontSize: "0.9rem" }}>
                Aktivni događaji
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: category.color,
                }}
              >
                {statistics.upcoming_events}
              </div>
              <div style={{ color: "#666", fontSize: "0.9rem" }}>
                Predstojeći
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: category.color,
                }}
              >
                {statistics.total_tickets_sold}
              </div>
              <div style={{ color: "#666", fontSize: "0.9rem" }}>
                Prodane karte
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: category.color,
                }}
              >
                {Math.round(statistics.average_price || 0)}
              </div>
              <div style={{ color: "#666", fontSize: "0.9rem" }}>
                Prosečna cena
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ marginBottom: "2rem" }}>
        <Button variant="outline" onClick={() => navigate("/categories")}>
          ← Nazad na kategorije
        </Button>
      </div>

      {/* Events section */}
      <div>
        <h2 style={{ marginBottom: "1.5rem" }}>
          Događaji u kategoriji "{category.name}"
        </h2>

        {events.length > 0 ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "1.5rem",
                marginBottom: "2rem",
              }}
            >
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <h3>Nema događaja</h3>
            <p style={{ color: "#666" }}>
              Trenutno nema aktivnih događaja u ovoj kategoriji.
            </p>
            <Button onClick={() => navigate("/events")}>
              Pogledaj sve događaje
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
export default CategoryDetailsPage;
