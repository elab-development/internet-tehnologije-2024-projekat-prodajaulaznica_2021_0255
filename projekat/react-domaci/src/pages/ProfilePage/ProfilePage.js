import React, { useState, useEffect } from "react";
import Button from "../../components/common/Button";
import "./ProfilePage.css";
import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../../components/common/LogoutButton";
import UserProfile from "../../components/common/UserProfile";
import PasswordChange from "../../components/common/PasswordChange";
import PurchaseHistory from "../../components/tickets/PurchaseHistory";

const ProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(false);
    }
  }, [user]);

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatUserName = (user) => {
    if (user?.name) return user.name;
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user?.email) return user.email.split("@")[0];
    return "Korisnik";
  };

  const getJoinDate = (user) => {
    if (user?.created_at) {
      return new Date(user.created_at).toLocaleDateString("sr-RS", {
        year: "numeric",
        month: "long",
      });
    }
    return "Nedavno";
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <p>Morate biti prijavljeni da biste pristupili profilu.</p>
            <Button onClick={() => (window.location.href = "/login")}>
              Prijavite se
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header sekcija */}
        <header className="profile-header">
          <div className="profile-avatar">
            <div className="avatar-circle">
              <span className="avatar-initials">
                {getInitials(formatUserName(user))}
              </span>
            </div>
            <div className="status-indicator online"></div>
          </div>

          <div className="profile-info">
            <h1 className="profile-name">{formatUserName(user)}</h1>
            <div className="profile-email">
              <span className="email-icon">✉️</span>
              <span>{user.email}</span>
            </div>
            {user.location && (
              <div className="profile-location">
                <span className="location-icon">📍</span>
                <span>{user.location}</span>
              </div>
            )}

            {/* Dekorativni elementi umesto statistika */}
            <div className="profile-decorative">
              <div className="decorative-item">
                <span className="decorative-icon">🎭</span>
                <span className="decorative-text">Ljubitelj događaja</span>
              </div>
              <div className="decorative-item">
                <span className="decorative-icon">⭐</span>
                <span className="decorative-text">Premium korisnik</span>
              </div>
              <div className="decorative-item">
                <span className="decorative-icon">🗓️</span>
                <span className="decorative-text">
                  Član od {getJoinDate(user)}
                </span>
              </div>
            </div>
          </div>

          {/* Logout dugme - izdvojeno iz profile-info */}
          <div className="profile-header-actions">
            <LogoutButton variant="danger" size="medium">
              Odjavi se
            </LogoutButton>
          </div>
        </header>

        {/* User management section */}
        <section className="user-management-section">
          <UserProfile />
          <PasswordChange />
        </section>

        {/* Purchase History section */}
        <section className="tickets-section">
          <PurchaseHistory />
        </section>

        {/* Navigacija */}
        <div className="profile-actions">
          <Button variant="outline" onClick={() => window.history.back()}>
            ← Nazad
          </Button>
          <Button variant="primary" onClick={() => window.location.reload()}>
            🔄 Osveži profil
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
