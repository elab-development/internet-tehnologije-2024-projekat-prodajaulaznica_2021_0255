import React, { createContext, useContext, useState, useEffect } from "react";
import apiService from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("auth_token"));

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, [token]);

  const login = async (credentials) => {
    try {
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
      }
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.message || "Login failed",
      };
    }
  };

  const register = async (userData) => {
    try {
      await apiService.getCsrfCookie();

      const response = await apiService.register(userData);

      if (response.success) {
        const { user, access_token } = response.data;

        setUser(user);
        setToken(access_token);
        localStorage.setItem("auth_token", access_token);
        localStorage.setItem("user", JSON.stringify(user));

        return { success: true, user };
      }
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: error.message || "Registration failed",
      };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await apiService.logout();
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
    }
  };

  const isAuthenticated = () => {
    return !!(user && token);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
