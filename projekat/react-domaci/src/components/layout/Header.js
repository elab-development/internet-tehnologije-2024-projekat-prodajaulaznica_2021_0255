import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { CartContext } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import AuthStatus from "../common/AuthStatus/AuthStatus";
import "./Header.css";

const Header = () => {
  const APP_TITLE = "🎫 TicketMaster Pro";
  const { cartItems } = useContext(CartContext);
  const location = useLocation();
  const { isAdmin, isAuthenticated } = useAuth();

  const cartItemsCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const isActive = (path) => {
    return location.pathname === path ? "nav-link active" : "nav-link";
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <h1>{APP_TITLE}</h1>
        </Link>

        <nav className="navigation">
          <div className="nav-links">
            <Link to="/" className={isActive("/")}>
              Početna
            </Link>
            <Link to="/events" className={isActive("/events")}>
              Događaji
            </Link>
            <Link to="/categories" className={isActive("/categories")}>
              Kategorije
            </Link>
            {isAuthenticated() && (
              <Link to="/tickets" className={isActive("/tickets")}>
                Moje karte
              </Link>
            )}
          </div>

          <div className="nav-actions">
            <Link to="/cart" className="cart-link">
              <span>Korpa</span>
              {cartItemsCount > 0 && (
                <span className="cart-count">{cartItemsCount}</span>
              )}
            </Link>

            {isAdmin() && (
              <div className="admin-links">
                <Link to="/admin/dashboard" className="admin-link">
                  Dashboard
                </Link>
                <Link to="/admin/events" className="admin-link">
                  Događaji
                </Link>
                <Link to="/admin/validation" className="admin-link">
                  Validacija
                </Link>
              </div>
            )}

            <AuthStatus />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
