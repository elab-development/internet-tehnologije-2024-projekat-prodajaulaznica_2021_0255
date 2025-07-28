import React, { useState, useEffect } from "react";
import EventCard from "../../components/common/EventCard";
import InputField from "../../components/common/InputField";
import Pagination from "../../components/common/Pagination";
import Button from "../../components/common/Button";
import { apiService } from "../../services/api";
import useDebounce from "../../hooks/useDebounce";
import "./EventsPage.css";

const EventsPage = () => {
  // State za događaje i loading
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State za paginaciju
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const eventsPerPage = 4;

  // State za pretraživanje i filtriranje
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState([]);

  // State za sortiranje
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("asc");

  // Debounced search term za optimizaciju
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Učitavanje kategorija pri inicijalnom render-u
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiService.getCategories();
        setCategories(response.data);
      } catch (err) {
        console.error("Greška pri učitavanju kategorija:", err);
      }
    };

    loadCategories();
  }, []);

  // Glavna funkcija za učitavanje događaja
  const loadEvents = async (page = 1, search = "", category = "all") => {
    try {
      setLoading(true);
      setError(null);

      let response;

      if (search || category !== "all") {
        // Ako ima pretraživanja ili filtera, koristimo search funkciju
        response = await apiService.searchEvents(search, category);

        // Manuelna paginacija za search rezultate
        const startIndex = (page - 1) * eventsPerPage;
        const endIndex = startIndex + eventsPerPage;
        const paginatedResults = response.data.slice(startIndex, endIndex);

        setEvents(paginatedResults);
        setTotalEvents(response.data.length);
        setTotalPages(Math.ceil(response.data.length / eventsPerPage));
      } else {
        // Inače koristimo regularno učitavanje sa paginacijom
        response = await apiService.getEvents(page, eventsPerPage);
        setEvents(response.data);
        setTotalEvents(response.totalEvents);
        setTotalPages(response.totalPages);
      }

      setCurrentPage(page);
    } catch (err) {
      setError(err.message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Effect za učitavanje događaja kada se promene filteri
  useEffect(() => {
    loadEvents(1, debouncedSearchTerm, selectedCategory);
  }, [debouncedSearchTerm, selectedCategory]);

  // Handler za promenu stranice
  const handlePageChange = (page) => {
    loadEvents(page, debouncedSearchTerm, selectedCategory);
    // Scroll na vrh stranice
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handler za reset filtera
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSortBy("date");
    setSortOrder("asc");
    setCurrentPage(1);
  };

  // Sortiranje događaja
  const sortedEvents = [...events].sort((a, b) => {
    let aValue, bValue;

    switch (sortBy) {
      case "price":
        aValue = a.price;
        bValue = b.price;
        break;
      case "date":
        aValue = new Date(a.date);
        bValue = new Date(b.date);
        break;
      case "title":
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
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
      <div className="events-header">
        <h1>🎫 Svi događaji</h1>
        <p>Pronađite savršen događaj za vas</p>
      </div>

      {/* Filteri i pretraživanje */}
      <div className="events-filters">
        <div className="filters-row">
          <InputField
            placeholder=" Pretražite događaje..."
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
                <option key={category} value={category}>
                  {category}
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
              <option value="date">Datum</option>
              <option value="price">Cena</option>
              <option value="title">Naziv</option>
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
            🔄 Reset
          </Button>
        </div>
      </div>

      {/* Rezultati */}
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
                    ` u kategoriji "${selectedCategory}"`}
                </span>
              )}
            </span>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            Učitavanje događaja...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="error">
            <span>⚠️ {error}</span>
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
                <h3>😕 Nema događaja</h3>
                <p>Nema događaja koji odgovaraju vašim kriterijumima.</p>
                <Button onClick={handleResetFilters}>
                  Prikaži sve događaje
                </Button>
              </div>
            )}

            {/* Pagination */}
            {sortedEvents.length > 0 && totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
