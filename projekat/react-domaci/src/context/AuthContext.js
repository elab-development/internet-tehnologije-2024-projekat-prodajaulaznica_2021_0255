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
        await apiService.logout();
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuthData();
      setLoading(false);
    }
  };

  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const isAuthenticated = () => {
    return !!(user && token);
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
