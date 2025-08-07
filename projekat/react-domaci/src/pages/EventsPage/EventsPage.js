import React, { useState, useEffect } from "react";
import EventCard from "../../components/common/EventCard";
import Pagination from "../../components/common/Pagination";
import Button from "../../components/common/Button";
import apiService from "../../services/api";
import AdvancedSearch from "../../components/common/AdvancedSearch";
import "./EventsPage.css";

const EventsPage = () => {
  // State for events and loading
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for current filters, managed by the AdvancedSearch component
  const [currentFilters, setCurrentFilters] = useState({});

  // State for Laravel pagination
  const [paginationData, setPaginationData] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 6,
    total: 0,
    from: 0,
    to: 0,
  });

  // State for categories
  const [categories, setCategories] = useState([]);

  // Load categories from Laravel API on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiService.getCategories();
        if (response.success) {
          setCategories(response.data || []);
        }
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };

    loadCategories();
  }, []);

  // Main function for loading events with filters and Laravel pagination
  // This function now accepts filters as an argument
  const loadEventsWithFilters = async (page = 1, filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      // Build query parameters based on the provided filters
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("per_page", paginationData.per_page);

      // Add all filters to the search parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          params.append(key, value);
        }
      });

      const response = await apiService.getEventsPaginated(params.toString());

      if (response.success) {
        setEvents(response.data.data || []);
        setPaginationData({
          current_page: response.data.current_page || 1,
          last_page: response.data.last_page || 1,
          per_page: response.data.per_page || 6,
          total: response.data.total || 0,
          from: response.data.from || 0,
          to: response.data.to || 0,
        });
      }
    } catch (err) {
      setError(err.message || "Greška pri učitavanju događaja");
      setEvents([]);
      setPaginationData({
        current_page: 1,
        last_page: 1,
        per_page: 6,
        total: 0,
        from: 0,
        to: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Effect for loading events when filters change
  useEffect(() => {
    // Reset to the first page when filters change
    loadEventsWithFilters(1, currentFilters);
  }, [currentFilters]);

  // Handle page change, passing the current filters
  const handlePageChange = (page) => {
    loadEventsWithFilters(page, currentFilters);
    // Scroll to top of page for better UX
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // The AdvancedSearch component now handles all the filter logic internally,
  // so the old individual states and reset function are no longer needed here.

  return (
    <div className="events-page">
      {/* Events header */}
      <div className="events-header">
        <h1>Događaji</h1>
        <p>Pronađite savršen događaj za vas</p>
      </div>

      {/* Replaced old filters section with AdvancedSearch component */}
      <AdvancedSearch
        onSearch={(filters) => {
          setCurrentFilters(filters);
        }}
        categories={categories}
      />

      {/* Results */}
      <div className="events-results">
        <div className="results-info">
          {loading ? (
            <span>Učitavanje...</span>
          ) : (
            <div className="pagination-info">
              <span>
                Prikazano {paginationData.from}-{paginationData.to} od{" "}
                {paginationData.total} događaja
              </span>
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Učitavanje događaja...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="error">
            <span>{error}</span>
            <Button
              onClick={() =>
                loadEventsWithFilters(
                  paginationData.current_page,
                  currentFilters
                )
              }
            >
              Pokušaj ponovo
            </Button>
          </div>
        )}

        {/* Events grid */}
        {!loading && !error && (
          <>
            {events.length > 0 ? (
              <div className="events-grid">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="no-events">
                <h3>Nema događaja</h3>
                <p>Nema događaja koji odgovaraju vašim kriterijumima.</p>
                <Button onClick={() => setCurrentFilters({})}>
                  Prikaži sve događaje
                </Button>
              </div>
            )}
          </>
        )}

        {/* Laravel Pagination */}
        {events.length > 0 && paginationData.last_page > 1 && (
          <Pagination
            currentPage={paginationData.current_page}
            totalPages={paginationData.last_page}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
};

export default EventsPage;
