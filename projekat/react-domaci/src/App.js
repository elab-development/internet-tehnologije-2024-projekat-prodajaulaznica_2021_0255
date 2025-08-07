import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage/HomePage";
import EventsPage from "./pages/EventsPage/EventsPage";
import EventDetailsPage from "./pages/EventDetailsPage/EventDetailsPage";
import CartPage from "./pages/CartPage/CartPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import RegisterPage from "./pages/RegisterPage/RegistrerPage";
import ProtectedRoute from "./components/common/ProtectedRoute/ProtectedRoute";
import GuestRoute from "./components/common/GuestRoute/GuestRoute";
import CategoriesPage from "./pages/CategoriesPage/CategoriesPage";
import CategoryDetailsPage from "./pages/CategoryDetailsPage/CategoryDetailsPage";
import AdminRoute from "./components/common/AdminRoute/AdminRoute";
import AdminEventsPage from "./pages/AdminEventsPage/AdminEventsPage";
import TicketsPage from "./pages/TicketsPage/TicketsPage";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="App">
            <Layout>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/:id" element={<EventDetailsPage />} />

                {/* Guest only routes (redirect if authenticated) */}
                <Route
                  path="/login"
                  element={
                    <GuestRoute>
                      <LoginPage />
                    </GuestRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <GuestRoute>
                      <RegisterPage />
                    </GuestRoute>
                  }
                />

                {/* Protected routes (require authentication) */}
                <Route
                  path="/cart"
                  element={
                    <ProtectedRoute>
                      <CartPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                {/* Catch all route */}
                <Route
                  path="*"
                  element={
                    <div
                      style={{
                        textAlign: "center",
                        padding: "2rem",
                      }}
                    >
                      <h2>Stranica nije pronađena</h2>
                      <p>Tražena stranica ne postoji.</p>
                      <a href="/">Vrati se na početnu</a>
                    </div>
                  }
                />

                <Route path="/categories" element={<CategoriesPage />} />
                <Route
                  path="/categories/:id"
                  element={<CategoryDetailsPage />}
                />
                <Route
                  path="/admin/events"
                  element={
                    <AdminRoute>
                      <AdminEventsPage />
                    </AdminRoute>
                  }
                />
                <Route path="/tickets" element={<TicketsPage />} />
              </Routes>
            </Layout>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
