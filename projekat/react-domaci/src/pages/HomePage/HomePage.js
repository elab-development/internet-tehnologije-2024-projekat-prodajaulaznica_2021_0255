import React, { useState, useEffect } from "react";
import EventCard from "../../components/common/EventCard";
import Button from "../../components/common/Button";
import apiService from "../../services/api";

const HomePage = () => {
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Weather state
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(null);
  const [forecast, setForecast] = useState([]);

  // Weather API configuration
  const API_KEY = "6cf87a14fd2a4b48f276a51bb0b17b67";
  const CITY = "Beograd";
  const COUNTRY = "RS";

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
          eventsArray = response.data.data;
        } else if (
          response?.data &&
          typeof response.data === "object" &&
          response.data.data
        ) {
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
    fetchWeatherData();
    fetchForecastData();
  }, []);

  const fetchWeatherData = async () => {
    try {
      setWeatherLoading(true);
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${CITY},${COUNTRY}&appid=${API_KEY}&units=metric&lang=sr`
      );

      if (!response.ok) {
        throw new Error("Greška pri učitavanju vremenske prognoze");
      }

      const data = await response.json();
      setWeatherData(data);
    } catch (err) {
      setWeatherError(err.message);
    } finally {
      setWeatherLoading(false);
    }
  };

  const fetchForecastData = async () => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${CITY},${COUNTRY}&appid=${API_KEY}&units=metric&lang=sr&cnt=16`
      );

      if (!response.ok) {
        throw new Error("Greška pri učitavanju prognoze");
      }

      const data = await response.json();
      // Uzimamo prognozu za sledeća 4 dana (svaki 8. element = 24h)
      const dailyForecast = data.list
        .filter((item, index) => index % 8 === 0)
        .slice(0, 4);
      setForecast(dailyForecast);
    } catch (err) {
      console.error("Greška pri učitavanju prognoze:", err);
    }
  };

  const getWeatherIcon = (iconCode) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString("sr-RS", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString("sr-RS", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

      {/* Vremenska prognoza sekcija */}
      <section
        className="weather-section"
        style={{
          padding: "2rem",
          backgroundColor: "#f8f9fa",
          marginTop: "2rem",
        }}
      >
        <div
          className="section-header"
          style={{ textAlign: "center", marginBottom: "2rem" }}
        >
          <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
            🌤️ Vremenska prognoza
          </h2>
          <span
            className="last-updated"
            style={{ color: "#666", fontSize: "0.9rem" }}
          >
            Poslednje ažuriranje: {getCurrentTime()}
          </span>
        </div>

        {weatherLoading && (
          <div
            className="weather-loading"
            style={{ textAlign: "center", padding: "2rem" }}
          >
            <div
              className="loading-spinner"
              style={{
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #3498db",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                animation: "spin 2s linear infinite",
                margin: "0 auto 1rem",
              }}
            ></div>
            <p>Učitavanje vremenske prognoze...</p>
          </div>
        )}

        {weatherError && (
          <div
            className="weather-error"
            style={{ textAlign: "center", padding: "2rem" }}
          >
            <p style={{ color: "red", marginBottom: "1rem" }}>
              ⚠️ {weatherError}
            </p>
            <Button variant="outline" onClick={fetchWeatherData}>
              Pokušaj ponovo
            </Button>
          </div>
        )}

        {weatherData && !weatherLoading && (
          <div
            className="weather-content"
            style={{ maxWidth: "1200px", margin: "0 auto" }}
          >
            {/* Trenutno vreme */}
            <div
              className="current-weather"
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "2rem",
                marginBottom: "2rem",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                display: "flex",
                alignItems: "center",
                gap: "2rem",
                flexWrap: "wrap",
              }}
            >
              <div
                className="current-main"
                style={{ display: "flex", alignItems: "center", gap: "1rem" }}
              >
                <img
                  src={getWeatherIcon(weatherData.weather[0].icon)}
                  alt={weatherData.weather[0].description}
                  className="weather-icon-large"
                  style={{ width: "80px", height: "80px" }}
                />
                <div className="current-temp">
                  <span
                    className="temp-value"
                    style={{ fontSize: "3rem", fontWeight: "bold" }}
                  >
                    {Math.round(weatherData.main.temp)}°
                  </span>
                  <span
                    className="temp-unit"
                    style={{ fontSize: "1.5rem", color: "#666" }}
                  >
                    C
                  </span>
                </div>
              </div>
              <div className="current-details" style={{ flex: 1 }}>
                <h3
                  className="weather-description"
                  style={{
                    fontSize: "1.5rem",
                    marginBottom: "1rem",
                    textTransform: "capitalize",
                  }}
                >
                  {weatherData.weather[0].description}
                </h3>
                <div
                  className="weather-metrics"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    className="metric"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span className="metric-icon">🌡️</span>
                    <span>
                      Oseća se kao {Math.round(weatherData.main.feels_like)}°C
                    </span>
                  </div>
                  <div
                    className="metric"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span className="metric-icon">💧</span>
                    <span>Vlažnost {weatherData.main.humidity}%</span>
                  </div>
                  <div
                    className="metric"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span className="metric-icon">💨</span>
                    <span>Vetar {Math.round(weatherData.wind.speed)} m/s</span>
                  </div>
                  <div
                    className="metric"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span className="metric-icon">👁️</span>
                    <span>
                      Vidljivost {(weatherData.visibility / 1000).toFixed(1)} km
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Prognoza za sledeće dane */}
            {forecast.length > 0 && (
              <div className="forecast-section">
                <h3
                  className="forecast-title"
                  style={{
                    fontSize: "1.5rem",
                    marginBottom: "1rem",
                    textAlign: "center",
                  }}
                >
                  Prognoza za sledeće dane
                </h3>
                <div
                  className="forecast-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {forecast.map((day, index) => (
                    <div
                      key={index}
                      className="forecast-item"
                      style={{
                        backgroundColor: "white",
                        borderRadius: "8px",
                        padding: "1.5rem",
                        textAlign: "center",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    >
                      <div
                        className="forecast-date"
                        style={{
                          fontWeight: "bold",
                          marginBottom: "0.5rem",
                          color: "#333",
                        }}
                      >
                        {index === 0 ? "Sutra" : formatDate(day.dt)}
                      </div>
                      <img
                        src={getWeatherIcon(day.weather[0].icon)}
                        alt={day.weather[0].description}
                        className="forecast-icon"
                        style={{
                          width: "60px",
                          height: "60px",
                          margin: "0.5rem 0",
                        }}
                      />
                      <div
                        className="forecast-temps"
                        style={{ margin: "0.5rem 0" }}
                      >
                        <span
                          className="temp-high"
                          style={{
                            fontWeight: "bold",
                            fontSize: "1.2rem",
                            marginRight: "0.5rem",
                          }}
                        >
                          {Math.round(day.main.temp_max)}°
                        </span>
                        <span
                          className="temp-low"
                          style={{
                            color: "#666",
                            fontSize: "1rem",
                          }}
                        >
                          {Math.round(day.main.temp_min)}°
                        </span>
                      </div>
                      <div
                        className="forecast-description"
                        style={{
                          fontSize: "0.9rem",
                          color: "#666",
                          textTransform: "capitalize",
                        }}
                      >
                        {day.weather[0].description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dugme za osvežavanje */}
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <Button variant="primary" onClick={fetchWeatherData}>
            🔄 Osveži vremensku prognozu
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
