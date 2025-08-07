import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import apiService from "../../services/api";

const AdminDashboardPage = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [revenueChart, setRevenueChart] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [topEvents, setTopEvents] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartPeriod, setChartPeriod] = useState(30);

  useEffect(() => {
    if (isAdmin()) {
      loadDashboardData();
    }
  }, [chartPeriod]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        overviewRes,
        revenueRes,
        categoryRes,
        topEventsRes,
        activityRes,
        upcomingRes,
      ] = await Promise.all([
        apiService.getAdminOverview(),
        apiService.getRevenueChart(chartPeriod),
        apiService.getCategoryStats(),
        apiService.getTopEvents(10, "revenue"),
        apiService.getRecentActivity(15),
        apiService.getUpcomingEvents(),
      ]);

      if (overviewRes.success) setOverview(overviewRes.data);
      if (revenueRes.success) setRevenueChart(revenueRes.data);
      if (categoryRes.success) setCategoryStats(categoryRes.data);
      if (topEventsRes.success) setTopEvents(topEventsRes.data);
      if (activityRes.success) setRecentActivity(activityRes.data);
      if (upcomingRes.success) setUpcomingEvents(upcomingRes.data);
    } catch (err) {
      setError(err.message || "Greška pri učitavanju dashboard-a");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("sr-RS").format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("sr-RS", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getChangeIcon = (change) => {
    if (change > 0) return "📈";
    if (change < 0) return "📉";
    return "➡️";
  };

  const getChangeColor = (change) => {
    if (change > 0) return "#28a745";
    if (change < 0) return "#dc3545";
    return "#6c757d";
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case "high":
        return "#dc3545";
      case "medium":
        return "#ffc107";
      case "low":
        return "#28a745";
      default:
        return "#6c757d";
    }
  };

  if (!isAdmin()) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <h2>Nemate dozvolu</h2>
        <p>Admin dashboard je dostupan samo administratorima.</p>
        <Button onClick={() => navigate("/")}>Vrati se na početnu</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem" }}>
        <LoadingSpinner message="Učitavanje admin dashboard-a..." />
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1>Admin Dashboard</h1>
        <Button onClick={loadDashboardData}>🔄 Osveži</Button>
      </div>

      {error && (
        <div
          style={{
            color: "#dc3545",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            padding: "1rem",
            marginBottom: "2rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Overview Stats */}
      {overview && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <StatCard
            title="Ukupni prihod"
            value={`${formatPrice(overview.total_revenue)} RSD`}
            change={overview.revenue_change}
            icon="💰"
          />
          <StatCard
            title="Prodane karte"
            value={overview.total_tickets_sold}
            change={overview.tickets_change}
            icon="🎫"
          />
          <StatCard
            title="Aktivni događaji"
            value={overview.active_events}
            subtitle={`od ${overview.total_events} ukupno`}
            icon="📅"
          />
          <StatCard
            title="Registrovani korisnici"
            value={overview.total_users}
            icon="👥"
          />
        </div>
      )}

      {/* Revenue Chart */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          padding: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h3>Prihodi po danima</h3>
          <select
            value={chartPeriod}
            onChange={(e) => setChartPeriod(Number(e.target.value))}
            style={{
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          >
            <option value={7}>Poslednih 7 dana</option>
            <option value={30}>Poslednih 30 dana</option>
            <option value={90}>Poslednja 3 meseca</option>
          </select>
        </div>

        <SimpleChart data={revenueChart} />
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}
      >
        {/* Top Events */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            padding: "1.5rem",
          }}
        >
          <h3>Najprofitabilniji događaji</h3>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {topEvents.map((event, index) => (
              <div
                key={event.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1rem 0",
                  borderBottom:
                    index < topEvents.length - 1 ? "1px solid #eee" : "none",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold" }}>{event.name}</div>
                  <div style={{ fontSize: "0.875rem", color: "#666" }}>
                    {event.tickets_sold} karata • {event.attendance_rate}%
                    popunjenost
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: "bold", color: "#28a745" }}>
                    {formatPrice(event.revenue)} RSD
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            padding: "1.5rem",
          }}
        >
          <h3>Poslednje aktivnosti</h3>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {recentActivity.map((activity, index) => (
              <div
                key={`${activity.type}-${activity.id}`}
                style={{
                  padding: "0.75rem 0",
                  borderBottom:
                    index < recentActivity.length - 1
                      ? "1px solid #eee"
                      : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  <span>{activity.type === "purchase" ? "💳" : "❌"}</span>
                  <span style={{ fontSize: "0.875rem" }}>
                    {activity.description}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#666",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{formatDate(activity.timestamp)}</span>
                  <span
                    style={{
                      color:
                        activity.type === "purchase" ? "#28a745" : "#dc3545",
                    }}
                  >
                    {activity.type === "purchase" ? "+" : "-"}
                    {formatPrice(activity.amount)} RSD
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            padding: "1.5rem",
            marginTop: "2rem",
          }}
        >
          <h3>Predstojeći događaji (sledejih 30 dana)</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1rem",
            }}
          >
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "1rem",
                  borderLeft: `4px solid ${getUrgencyColor(event.urgency)}`,
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
                  {event.name}
                </div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#666",
                    marginBottom: "0.5rem",
                  }}
                >
                  📅 {formatDate(event.start_date)} • 📍 {event.location}
                </div>
                <div style={{ fontSize: "0.875rem" }}>
                  🎫 {event.tickets_sold}/{event.total_tickets} (
                  {event.sales_rate}%)
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: getUrgencyColor(event.urgency),
                    marginTop: "0.5rem",
                  }}
                >
                  {event.days_until} dana do događaja
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, change, subtitle, icon }) => (
  <div
    style={{
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      padding: "1.5rem",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <div style={{ fontSize: "2rem" }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: "0.875rem",
            color: "#666",
            marginBottom: "0.25rem",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            marginBottom: "0.25rem",
          }}
        >
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: "0.75rem", color: "#666" }}>{subtitle}</div>
        )}
        {change !== undefined && (
          <div
            style={{
              fontSize: "0.75rem",
              color:
                change > 0 ? "#28a745" : change < 0 ? "#dc3545" : "#6c757d",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span>{change > 0 ? "📈" : change < 0 ? "📉" : "➡️"}</span>
            <span>{Math.abs(change)}% u odnosu na prošli mesec</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

// Simple Chart Component
const SimpleChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
        Nema podataka za prikaz
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue));

  return (
    <div
      style={{
        height: "200px",
        display: "flex",
        alignItems: "end",
        gap: "2px",
      }}
    >
      {data.map((day, index) => (
        <div
          key={index}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              backgroundColor: "#007bff",
              height:
                maxRevenue > 0
                  ? `${(day.revenue / maxRevenue) * 150}px`
                  : "2px",
              borderRadius: "2px 2px 0 0",
              marginBottom: "0.5rem",
            }}
            title={`${day.formatted_date}: ${day.revenue} RSD`}
          />
          <div style={{ fontSize: "0.75rem", color: "#666" }}>
            {day.formatted_date}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminDashboardPage;
