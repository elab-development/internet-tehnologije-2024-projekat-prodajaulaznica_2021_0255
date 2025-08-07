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

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const eventsPerPage = 6;

  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState([]);

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

  // Main function for loading events from Laravel API
  const loadEvents = async (page = 1, search = "", category = "all") => {
    setLoading(true);
    setError(null);

    try {
      let response;

      if (search.trim() || category !== "all") {
        // Use search API
        response = await apiService.searchEvents(search, category);

        if (response.success) {
          const allResults = response.data || [];

          // Manual pagination for search results
          const startIndex = (page - 1) * eventsPerPage;
          const endIndex = startIndex + eventsPerPage;
          const paginatedResults = allResults.slice(startIndex, endIndex);

          setEvents(paginatedResults);
          setTotalEvents(allResults.length);
          setTotalPages(Math.ceil(allResults.length / eventsPerPage));
        }
      } else {
        // Use regular pagination API
        response = await apiService.getEvents(page, eventsPerPage);

        if (response.success) {
          setEvents(response.data || []);
          setTotalEvents(response.totalEvents || 0);
          setTotalPages(response.totalPages || 1);
        }
      }

      setCurrentPage(page);
    } catch (err) {
      setError(err.message || "Greška pri učitavanju događaja");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Effect for loading events when filters change
  useEffect(() => {
    loadEvents(1, debouncedSearchTerm, selectedCategory);
  }, [debouncedSearchTerm, selectedCategory]);

  // Handle page change
  const handlePageChange = (page) => {
    loadEvents(page, debouncedSearchTerm, selectedCategory);
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle reset filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSortBy("start_date");
    setSortOrder("asc");
    setCurrentPage(1);
  };

  // Sort events (client-side for now)
  const sortedEvents = [...events].sort((a, b) => {
    let aValue, bValue;

    switch (sortBy) {
      case "price":
        aValue = parseFloat(a.price) || 0;
        bValue = parseFloat(b.price) || 0;
        break;
      case "start_date":
        aValue = new Date(a.start_date);
        bValue = new Date(b.start_date);
        break;
      case "name":
        aValue = a.name?.toLowerCase() || "";
        bValue = b.name?.toLowerCase() || "";
        break;
      default:
        return 0;
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

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
            icon="🔍"
          />

          <div className="select-wrapper">
            <label>Kategorija:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              <option value="all">Sve kategorije</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
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
            <span>
              Pronađeno {totalEvents} događaj{totalEvents !== 1 ? "a" : ""}
              {(searchTerm || selectedCategory !== "all") && (
                <span className="filter-info">
                  {searchTerm && ` za "${searchTerm}"`}
                  {selectedCategory !== "all" &&
                    ` u kategoriji "${
                      categories.find((c) => c.id == selectedCategory)?.name
                    }"`}
                </span>
              )}
            </span>
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
                loadEvents(1, debouncedSearchTerm, selectedCategory)
              }
            >
              Pokušaj ponovo
            </Button>
          </div>
        )}

        {/* Events grid */}
        {!loading && !error && (
          <>
            {sortedEvents.length > 0 ? (
              <div className="events-grid">
                {sortedEvents.map((event) => (
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

        {/* Pagination */}
        {sortedEvents.length > 0 && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
};

export default EventsPage;
