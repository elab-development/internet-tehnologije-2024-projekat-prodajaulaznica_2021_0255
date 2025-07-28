import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { CartContext } from "../../context/CartContext";
import "./Header.css";

const Header = () => {
  const { cartItems } = useContext(CartContext);
  const location = useLocation();

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
          <h1>🎫 TicketMaster Pro</h1>
        </Link>

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
          <Link to="/login" className={isActive("/login")}>
            Prijava
          </Link>
        </nav>

        <div className="header-actions">
          <Link to="/cart" className="cart-link">
            🛒 Korpa{" "}
            {cartItemsCount > 0 && (
              <span className="cart-count">{cartItemsCount}</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
