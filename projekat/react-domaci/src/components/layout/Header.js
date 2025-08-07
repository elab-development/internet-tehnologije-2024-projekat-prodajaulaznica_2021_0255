import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { CartContext } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext"; // Import the useAuth hook
import AuthStatus from "../common/AuthStatus/AuthStatus";
import "./Header.css";

const Header = () => {
  // Use a constant for the app title to avoid repeating the string
  const APP_TITLE = "🎫 TicketMaster Pro";
  // Use the useContext hook to get cart items
  const { cartItems } = useContext(CartContext);
  // Use the useLocation hook to determine the current path for active links
  const location = useLocation();
  // Use the useAuth hook to get the isAdmin and isAuthenticated functions
  const { isAdmin, isAuthenticated } = useAuth();

  // Calculate the total number of items in the cart
  const cartItemsCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Helper function to determine if a link is the active one
  const isActive = (path) => {
    return location.pathname === path ? "nav-link active" : "nav-link";
  };

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo and app title link */}
        <Link to="/" className="logo">
          <h1>{APP_TITLE}</h1>
        </Link>

        {/* Navigation links */}
        <nav style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <Link to="/" style={{ textDecoration: "none", color: "#333" }}>
            Početna
          </Link>
          <Link to="/events" style={{ textDecoration: "none", color: "#333" }}>
            Događaji
          </Link>
          <Link
            to="/categories"
            style={{ textDecoration: "none", color: "#333" }}
          >
            Kategorije
          </Link>

          {isAuthenticated() && (
            <Link
              to="/tickets"
              style={{ textDecoration: "none", color: "#333" }}
            >
              Moje karte
            </Link>
          )}

          <Link to="/cart" style={{ textDecoration: "none", color: "#333" }}>
            Korpa{" "}
            {cartItemsCount > 0 && (
              <span className="cart-count">{cartItemsCount}</span>
            )}
          </Link>

          {isAdmin() && (
            <Link
              to="/admin/events"
              style={{
                textDecoration: "none",
                color: "#e74c3c",
                fontWeight: "bold",
              }}
            >
              Admin
            </Link>
          )}

          <AuthStatus />
        </nav>
      </div>
    </header>
  );
};

export default Header;
