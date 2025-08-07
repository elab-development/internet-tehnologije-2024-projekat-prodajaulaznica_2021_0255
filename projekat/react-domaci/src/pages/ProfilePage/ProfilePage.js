import React, { useState, useEffect } from "react";
import Button from "../../components/common/Button";
import "./ProfilePage.css";
import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../../components/common/LogoutButton";
import UserProfile from "../../components/common/UserProfile";
import PasswordChange from "../../components/common/PasswordChange";

const ProfilePage = () => {
  const { user } = useAuth();
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forecast, setForecast] = useState([]);

  // Zameniti sa vašim API ključem iz OpenWeatherMap
  const API_KEY = "6cf87a14fd2a4b48f276a51bb0b17b67";
  const CITY = "Beograd";
  const COUNTRY = "RS";

  useEffect(() => {
    fetchWeatherData();
    fetchForecastData();
  }, []);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${CITY},${COUNTRY}&appid=${API_KEY}&units=metric&lang=sr`
      );

      if (!response.ok) {
        throw new Error("Greška pri učitavanju vremenske prognoze");
      }

      const data = await response.json();
      setWeatherData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header sekcija */}
        <header className="profile-header">
          <div className="profile-avatar">
            <div className="avatar-circle">
              <span className="avatar-initials">MP</span>
            </div>
            <div className="status-indicator online"></div>
          </div>
          <div className="profile-info">
            <h1 className="profile-name">Tamara Sarajlija</h1>
            <div className="profile-location">
              <span className="location-icon">📍</span>
              <span>Beograd</span>
            </div>
            <div className="profile-actions">
              <LogoutButton variant="danger" size="medium">
                Odjavi se
              </LogoutButton>
            </div>

            <div className="profile-stats">
              <div className="stat">
                <span className="stat-number">24</span>
                <span className="stat-label">Kupljene karte</span>
              </div>
              <div className="stat">
                <span className="stat-number">8</span>
                <span className="stat-label">Događaji</span>
              </div>
              <div className="stat">
                <span className="stat-number">3</span>
                <span className="stat-label">Omiljeni izvođači</span>
              </div>
            </div>
          </div>
        </header>

        {/* --- Novi dodati deo: sekcija za upravljanje korisnicima --- */}
        {/* User management section */}
        <section className="user-management-section">
          <UserProfile />
          <PasswordChange />
        </section>

        {/* Vremenska prognoza sekcija */}
        <section className="weather-section">
          <div className="section-header">
            <h2>🌤️ Vremenska prognoza</h2>
            <span className="last-updated">
              Poslednje ažuriranje: {getCurrentTime()}
            </span>
          </div>

          {loading && (
            <div className="weather-loading">
              <div className="loading-spinner"></div>
              <p>Učitavanje vremenske prognoze...</p>
            </div>
          )}

          {error && (
            <div className="weather-error">
              <p>⚠️ {error}</p>
              <Button variant="outline" onClick={fetchWeatherData}>
                Pokušaj ponovo
              </Button>
            </div>
          )}

          {weatherData && !loading && (
            <div className="weather-content">
              {/* Trenutno vreme */}
              <div className="current-weather">
                <div className="current-main">
                  <img
                    src={getWeatherIcon(weatherData.weather[0].icon)}
                    alt={weatherData.weather[0].description}
                    className="weather-icon-large"
                  />
                  <div className="current-temp">
                    <span className="temp-value">
                      {Math.round(weatherData.main.temp)}°
                    </span>
                    <span className="temp-unit">C</span>
                  </div>
                </div>
                <div className="current-details">
                  <h3 className="weather-description">
                    {weatherData.weather[0].description}
                  </h3>
                  <div className="weather-metrics">
                    <div className="metric">
                      <span className="metric-icon">🌡️</span>
                      <span>
                        Oseća se kao {Math.round(weatherData.main.feels_like)}°C
                      </span>
                    </div>
                    <div className="metric">
                      <span className="metric-icon">💧</span>
                      <span>Vlažnost {weatherData.main.humidity}%</span>
                    </div>
                    <div className="metric">
                      <span className="metric-icon">💨</span>
                      <span>
                        Vetar {Math.round(weatherData.wind.speed)} m/s
                      </span>
                    </div>
                    <div className="metric">
                      <span className="metric-icon">👁️</span>
                      <span>
                        Vidljivost {(weatherData.visibility / 1000).toFixed(1)}{" "}
                        km
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prognoza za sledeće dane */}
              {forecast.length > 0 && (
                <div className="forecast-section">
                  <h3 className="forecast-title">Prognoza za sledeće dane</h3>
                  <div className="forecast-grid">
                    {forecast.map((day, index) => (
                      <div key={index} className="forecast-item">
                        <div className="forecast-date">
                          {index === 0 ? "Sutra" : formatDate(day.dt)}
                        </div>
                        <img
                          src={getWeatherIcon(day.weather[0].icon)}
                          alt={day.weather[0].description}
                          className="forecast-icon"
                        />
                        <div className="forecast-temps">
                          <span className="temp-high">
                            {Math.round(day.main.temp_max)}°
                          </span>
                          <span className="temp-low">
                            {Math.round(day.main.temp_min)}°
                          </span>
                        </div>
                        <div className="forecast-description">
                          {day.weather[0].description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Navigacija */}
        <div className="profile-actions">
          <Button variant="outline" onClick={() => window.history.back()}>
            ← Nazad
          </Button>
          <Button variant="primary" onClick={fetchWeatherData}>
            🔄 Osveži vreme
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
