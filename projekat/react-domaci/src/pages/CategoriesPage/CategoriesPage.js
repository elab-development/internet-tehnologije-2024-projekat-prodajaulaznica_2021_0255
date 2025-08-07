import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import apiService from "../../services/api";

const CategoriesPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const response = await apiService.getCategories();

        if (response.success) {
          setCategories(response.data || []);
        } else {
          setError("Greška pri učitavanju kategorija");
        }
      } catch (err) {
        setError(err.message || "Greška pri učitavanju kategorija");
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  const handleCategoryClick = (categoryId) => {
    navigate(`/categories/${categoryId}`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div>Učitavanje kategorija...</div>
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
    <div style={{ padding: "2rem" }}>
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1>Kategorije događaja</h1>
        <p style={{ color: "#666", fontSize: "1.1rem" }}>
          Pronađite događaje po kategorijama
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "2rem",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {categories.map((category) => (
          <div
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "2rem",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              cursor: "pointer",
              transition: "all 0.3s ease",
              border: `3px solid ${category.color || "#3498db"}`,
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-5px)";
              e.target.style.boxShadow = "0 8px 15px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
            }}
          >
            {/* Color accent */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                backgroundColor: category.color || "#3498db",
              }}
            />

            {/* Category icon/initial */}
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                backgroundColor: category.color || "#3498db",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
                color: "white",
                fontSize: "1.5rem",
                fontWeight: "bold",
              }}
            >
              {category.name.charAt(0).toUpperCase()}
            </div>

            <h3
              style={{
                margin: "0 0 1rem 0",
                color: "#333",
                fontSize: "1.3rem",
              }}
            >
              {category.name}
            </h3>

            <p
              style={{
                color: "#666",
                margin: "0 0 1.5rem 0",
                lineHeight: "1.5",
              }}
            >
              {category.description}
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "1rem",
                borderTop: "1px solid #eee",
              }}
            >
              <span
                style={{
                  color: category.color || "#3498db",
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                }}
              >
                {category.events_count || 0} događaja
              </span>

              <Button
                size="small"
                style={{
                  backgroundColor: category.color || "#3498db",
                  borderColor: category.color || "#3498db",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCategoryClick(category.id);
                }}
              >
                Pogledaj →
              </Button>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <h3>Nema kategorija</h3>
          <p style={{ color: "#666" }}>Trenutno nema dostupnih kategorija.</p>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
