import React, { useState, useEffect } from "react";
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
import { QueueProvider, useQueue } from "./context/QueueContext";
import RegisterPage from "./pages/RegisterPage/RegistrerPage";
import ProtectedRoute from "./components/common/ProtectedRoute/ProtectedRoute";
import GuestRoute from "./components/common/GuestRoute/GuestRoute";
import CategoriesPage from "./pages/CategoriesPage/CategoriesPage";
import CategoryDetailsPage from "./pages/CategoryDetailsPage/CategoryDetailsPage";
import AdminRoute from "./components/common/AdminRoute/AdminRoute";
import AdminEventsPage from "./pages/AdminEventsPage/AdminEventsPage";
import TicketsPage from "./pages/TicketsPage/TicketsPage";
import ValidationPage from "./pages/ValidationPage/ValidationPage";
import AdminDashboardPage from "./pages/AdminDashboardPage/AdminDashboardPage";
import QueueInterface from "./components/common/QueueInterface/QueueInterface";
import QueueAdminPage from "./pages/QueueAdminPage/QueueAdminPage";

import "./App.css";

// Glavna aplikacija sa rutama
const MainApp = () => {
  return (
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

        {/* Categories */}
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/categories/:id" element={<CategoryDetailsPage />} />

        {/* Tickets */}
        <Route path="/tickets" element={<TicketsPage />} />

        {/* Admin routes */}
        <Route
          path="/admin/events"
          element={
            <AdminRoute>
              <AdminEventsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/validation"
          element={
            <AdminRoute>
              <ValidationPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/queue"
          element={
            <AdminRoute>
              <QueueAdminPage />
            </AdminRoute>
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
      </Routes>
    </Layout>
  );
};

const AppContent = () => {
  const { queueStatus, checkQueueStatus, loading } = useQueue();
  const [hasAccess, setHasAccess] = useState(false); // ← Početno false!
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeQueue = async () => {
      try {
        console.log("Initializing queue system...");
        await checkQueueStatus();
      } catch (error) {
        console.error("Queue initialization failed:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeQueue();
  }, []);

  useEffect(() => {
    console.log("Queue status changed:", queueStatus);

    // Dozvoliti pristup SAMO ako je status active ili queue je disabled
    if (queueStatus.can_access === true && queueStatus.status === "active") {
      console.log("Access granted - user is active");
      setHasAccess(true);
    } else if (
      queueStatus.status === "not_in_queue" &&
      queueStatus.can_access === true
    ) {
      console.log("Access granted - queue disabled");
      setHasAccess(true);
    } else {
      console.log("Access denied - user must wait");
      setHasAccess(false);
    }
  }, [queueStatus]);

  // Pokazuj loading dok se ne inicijalizuje
  if (!isInitialized) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            width: "50px",
            height: "50px",
            border: "5px solid #f3f3f3",
            borderTop: "5px solid #007bff",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ marginTop: "1rem" }}>Učitavanje...</p>
        <style jsx>{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // SAMO ako korisnik ima pristup, prikaži glavnu aplikaciju
  if (hasAccess) {
    return <MainApp />;
  }

  // Inače UVEK prikaži queue interface
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <QueueInterface onAccessGranted={() => setHasAccess(true)} />
    </div>
  );
};

// Glavna App komponenta
function App() {
  return (
    <AuthProvider>
      <QueueProvider>
        <CartProvider>
          <Router>
            <div className="App">
              <AppContent />
            </div>
          </Router>
        </CartProvider>
      </QueueProvider>
    </AuthProvider>
  );
}

export default App;
