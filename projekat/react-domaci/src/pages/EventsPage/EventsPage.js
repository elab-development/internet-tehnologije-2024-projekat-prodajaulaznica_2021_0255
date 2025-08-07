import React, { useState, useEffect } from "react";
import EventCard from "../../components/common/EventCard";
import InputField from "../../components/common/InputField";
import Pagination from "../../components/common/Pagination";
import Button from "../../components/common/Button";
import apiService from "../../services/api";
import useDebounce from "../../hooks/useDebounce";
import "./EventsPage.css";

const EventsPage = () => {
  // State for events and loading
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for Laravel pagination
  const [paginationData, setPaginationData] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 6,
    total: 0,
    from: 0,
    to: 0,
  });

  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [availableOnly, setAvailableOnly] = useState(false);

  // State for sorting
  const [sortBy, setSortBy] = useState("start_date");
  const [sortOrder, setSortOrder] = useState("asc");

  // Debounced search term for optimization
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Load categories from Laravel API
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

  // Main function for loading events with Laravel pagination
  const loadEvents = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("per_page", paginationData.per_page);

      if (debouncedSearchTerm.trim()) {
        params.append("search", debouncedSearchTerm);
      }

      if (selectedCategory) {
        params.append("category_id", selectedCategory);
      }

      if (availableOnly) {
        params.append("available_only", "true");
      }

      params.append("sort_by", sortBy);
      params.append("sort_order", sortOrder);

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
    loadEvents(1); // Reset to first page when filters change
  }, [debouncedSearchTerm, selectedCategory, availableOnly, sortBy, sortOrder]);

  // Handle page change
  const handlePageChange = (page) => {
    loadEvents(page);
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle reset filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setAvailableOnly(false);
    setSortBy("start_date");
    setSortOrder("asc");
  };

  return (
    <div className="events-page">
      {/* Events header */}
      <div className="events-header">
        <h1>Događaji</h1>
        <p>Pronađite savršen događaj za vas</p>
      </div>

      {/* Filters and search */}
      <div className="events-filters">
        <div className="filter-row">
          <InputField
            placeholder="Pretražite događaje..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          <div className="select-wrapper">
            <label>Kategorija:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              <option value="">Sve kategorije</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="checkbox-wrapper">
            <label>
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
              />
              Samo dostupni
            </label>
          </div>

          <div className="select-wrapper">
            <label>Sortiraj po:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="start_date">Datum</option>
              <option value="price">Cena</option>
              <option value="name">Naziv</option>
              <option value="created_at">Najnoviji</option>
            </select>
          </div>

          <div className="select-wrapper">
            <label>Redosled:</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="order-select"
            >
              <option value="asc">Rastući</option>
              <option value="desc">Opadajući</option>
            </select>
          </div>

          <Button
            variant="outline"
            onClick={handleResetFilters}
            className="reset-btn"
          >
            Resetuj filtere
          </Button>
        </div>
      </div>

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
              {(searchTerm || selectedCategory || availableOnly) && (
                <span className="filter-info">
                  {searchTerm && ` • Pretraga: "${searchTerm}"`}
                  {selectedCategory &&
                    ` • Kategorija: "${
                      categories.find((c) => c.id == selectedCategory)?.name
                    }"`}
                  {availableOnly && ` • Samo dostupni`}
                </span>
              )}
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
            <Button onClick={() => loadEvents(paginationData.current_page)}>
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
                <Button onClick={handleResetFilters}>
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
