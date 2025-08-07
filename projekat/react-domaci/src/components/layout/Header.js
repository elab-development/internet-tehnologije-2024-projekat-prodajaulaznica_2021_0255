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
  // Use the useAuth hook to get the isAdmin function for conditional rendering
  const { isAdmin } = useAuth();

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
        <nav className="navigation">
          <Link to="/" className={isActive("/")}>
            Početna
          </Link>
          <Link to="/events" className={isActive("/events")}>
            Događaji
          </Link>
          <Link to="/profile" className={isActive("/profile")}>
            Profil
          </Link>
          {/* Conditionally render the admin link only if the user is an admin */}
          {isAdmin() && (
            <Link to="/admin/events" className={isActive("/admin/events")}>
              Admin
            </Link>
          )}
        </nav>

        {/* Header actions: Cart and Auth Status */}
        <div className="header-actions">
          <Link to="/cart" className="cart-link">
            🛒 Korpa{" "}
            {cartItemsCount > 0 && (
              <span className="cart-count">{cartItemsCount}</span>
            )}
          </Link>
          {/* AuthStatus component handles the login/logout display */}
          <AuthStatus />
        </div>
      </div>
    </header>
  );
};

export default Header;
