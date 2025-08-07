import React, { useState, useEffect } from "react";
import InputField from "../InputField";
import Button from "../Button";
import apiService from "../../../services/api";

const AdvancedSearch = ({ onSearch, categories = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    category_id: "",
    min_price: "",
    max_price: "",
    start_date: "",
    end_date: "",
    location: "",
    available_only: false,
    featured: false,
    active_only: true,
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Get search suggestions
  useEffect(() => {
    const getSuggestions = async () => {
      if (filters.search.length >= 2) {
        try {
          const response = await apiService.getSearchSuggestions(
            filters.search
          );
          if (response.success) {
            setSuggestions(response.data);
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error("Error getting suggestions:", error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timeoutId = setTimeout(getSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [filters.search]);

  const handleInputChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSuggestionClick = (suggestion) => {
    setFilters((prev) => ({
      ...prev,
      search: suggestion.value,
    }));
    setShowSuggestions(false);
  };

  const handleSearch = () => {
    // Remove empty values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([key, value]) => {
        if (typeof value === "boolean") return value;
        return value !== "" && value !== null && value !== undefined;
      })
    );

    onSearch(cleanFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      search: "",
      category_id: "",
      min_price: "",
      max_price: "",
      start_date: "",
      end_date: "",
      location: "",
      available_only: false,
      featured: false,
      active_only: true,
    };
    setFilters(resetFilters);
    onSearch(resetFilters);
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "1.5rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        marginBottom: "2rem",
      }}
    >
      {/* Basic search */}
      <div style={{ position: "relative", marginBottom: "1rem" }}>
        <InputField
          placeholder="Pretražite događaje, lokacije, kategorije..."
          value={filters.search}
          onChange={(e) => handleInputChange("search", e.target.value)}
          onFocus={() => setShowSuggestions(suggestions.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />

        {/* Search suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              backgroundColor: "white",
              border: "1px solid #ddd",
              borderRadius: "4px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              zIndex: 1000,
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  padding: "0.75rem",
                  cursor: "pointer",
                  borderBottom:
                    index < suggestions.length - 1 ? "1px solid #eee" : "none",
                  ":hover": { backgroundColor: "#f5f5f5" },
                }}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = "#f5f5f5")
                }
                onMouseLeave={(e) => (e.target.style.backgroundColor = "white")}
              >
                {suggestion.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advanced filters toggle */}
      <div style={{ marginBottom: "1rem" }}>
        <Button
          variant="outline"
          size="small"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "▲ Sakrij filtere" : "▼ Napredni filteri"}
        </Button>
      </div>

      {/* Advanced filters */}
      {isExpanded && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          {/* Category filter */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Kategorija:
            </label>
            <select
              value={filters.category_id}
              onChange={(e) => handleInputChange("category_id", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <option value="">Sve kategorije</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Price range */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Cena od:
            </label>
            <InputField
              type="number"
              placeholder="0"
              value={filters.min_price}
              onChange={(e) => handleInputChange("min_price", e.target.value)}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Cena do:
            </label>
            <InputField
              type="number"
              placeholder="10000"
              value={filters.max_price}
              onChange={(e) => handleInputChange("max_price", e.target.value)}
            />
          </div>

          {/* Date range */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Datum od:
            </label>
            <InputField
              type="date"
              value={filters.start_date}
              onChange={(e) => handleInputChange("start_date", e.target.value)}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Datum do:
            </label>
            <InputField
              type="date"
              value={filters.end_date}
              onChange={(e) => handleInputChange("end_date", e.target.value)}
            />
          </div>

          {/* Location */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Lokacija:
            </label>
            <InputField
              placeholder="Unesite lokaciju"
              value={filters.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Checkboxes */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={filters.available_only}
            onChange={(e) =>
              handleInputChange("available_only", e.target.checked)
            }
          />
          Samo dostupni
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={filters.featured}
            onChange={(e) => handleInputChange("featured", e.target.checked)}
          />
          Popularni događaji
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={filters.active_only}
            onChange={(e) => handleInputChange("active_only", e.target.checked)}
          />
          Samo aktivni događaji
        </label>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "1rem" }}>
        <Button onClick={handleSearch}>🔍 Pretraži</Button>
        <Button variant="outline" onClick={handleReset}>
          ↻ Resetuj
        </Button>
      </div>
    </div>
  );
};

export default AdvancedSearch;
