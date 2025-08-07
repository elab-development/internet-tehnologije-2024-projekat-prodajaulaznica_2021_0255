import React, { createContext, useContext, useState, useEffect } from "react";
import apiService from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("auth_token"));
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("auth_token");

      if (storedUser && storedToken) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        } catch (error) {
          console.error("Error parsing stored user data:", error);
          clearAuthData();
        }
      }

      setLoading(false);
      setIsInitialized(true);
    };

    initializeAuth();
  }, []);

  const clearAuthData = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
  };

  const login = async (credentials) => {
    try {
      setLoading(true);

      // Get CSRF cookie first
      await apiService.getCsrfCookie();

      const response = await apiService.login(credentials);

      if (response.success) {
        const { user, access_token } = response.data;

        setUser(user);
        setToken(access_token);
        localStorage.setItem("auth_token", access_token);
        localStorage.setItem("user", JSON.stringify(user));

        return { success: true, user };
      } else {
        return {
          success: false,
          message: response.message || "Login failed",
        };
      }
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.message || "Login failed",
        errors: error.errors || null,
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);

      await apiService.getCsrfCookie();

      const response = await apiService.register(userData);

      if (response.success) {
        const { user, access_token } = response.data;

        setUser(user);
        setToken(access_token);
        localStorage.setItem("auth_token", access_token);
        localStorage.setItem("user", JSON.stringify(user));

        return { success: true, user };
      } else {
        return {
          success: false,
          message: response.message || "Registration failed",
          errors: response.errors || null,
        };
      }
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: error.message || "Registration failed",
        errors: error.errors || null,
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);

      if (token) {
        // Call Laravel logout endpoint
        await apiService.logout();
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with logout even if API call fails
    } finally {
      // Clear all auth data
      clearAuthData();
      setLoading(false);

      // Redirect to home page
      window.location.href = "/";
    }
  };

  // Forced logout (when token expires)
  const forceLogout = () => {
    clearAuthData();
    window.location.href = "/login";
  };

  // Handle token refresh
  const checkAuthStatus = async () => {
    if (!token) return false;

    try {
      const response = await apiService.checkAuth();
      if (response.success) {
        // Update user data if needed
        if (response.data.user) {
          updateUser(response.data.user);
        }
        return true;
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      clearAuthData();
      return false;
    }

    return false;
  };

  const isAuthenticated = () => {
    return !!(user && token);
  };

  // Periodic auth check
  useEffect(() => {
    if (isAuthenticated()) {
      // Check auth status every 10 minutes
      const interval = setInterval(() => {
        checkAuthStatus();
      }, 10 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, token]);

  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const hasRole = (role) => {
    return user?.role === role;
  };

  const isAdmin = () => {
    return hasRole("admin");
  };

  const value = {
    user,
    token,
    loading,
    isInitialized,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated,
    hasRole,
    isAdmin,
    clearAuthData,
  };

  // Don't render children until auth is initialized
  if (!isInitialized) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
