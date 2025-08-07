import axios from "axios";

// Create axios instance for Laravel API
const api = axios.create({
  baseURL: "http://localhost:8000/api",
  timeout: 10000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Token refresh functionality
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with token refresh logic
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh token
        const refreshResponse = await refreshToken();
        const newToken = refreshResponse.access_token;

        localStorage.setItem("auth_token", newToken);
        processQueue(null, newToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Refresh failed, clear auth data and redirect
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");

        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);

// Token refresh function
const refreshToken = async () => {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    throw new Error("No token available");
  }

  const response = await axios.post(
    "http://localhost:8000/api/refresh",
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      withCredentials: true,
    }
  );

  return response.data.data;
};

export const apiService = {
  // Authentication
  getCsrfCookie: async () => {
    return await api.get("/csrf-cookie");
  },

  register: async (userData) => {
    return await api.post("/register", userData);
  },

  login: async (credentials) => {
    return await api.post("/login", credentials);
  },

  logout: async () => {
    return await api.post("/logout");
  },

  refreshToken: async () => {
    return await refreshToken();
  },

  // Check if token is valid
  checkAuth: async () => {
    return await api.get("/user");
  },

  // Laravel paginated events
  getEventsPaginated: async (queryString = "") => {
    return await api.get(`/events?${queryString}`);
  },

  // Updated existing getEvents to work with Laravel pagination
  getEvents: async (page = 1, limit = 6) => {
    const params = new URLSearchParams();
    params.append("page", page);
    params.append("per_page", limit);

    return await api.get(`/events?${params.toString()}`);
  },

  getEventById: async (id) => {
    return await api.get(`/events/${id}`);
  },

  searchEvents: async (searchTerm, category = "all") => {
    const params = new URLSearchParams();
    if (searchTerm) params.append("search", searchTerm);
    if (category !== "all") params.append("category_id", category);

    return await api.get(`/events?${params.toString()}`);
  },

  getFeaturedEvents: async () => {
    const response = await api.get("/events?featured=true");
    return { data: response.data || [] };
  },

  createEvent: async (eventData) => {
    return await api.post("/events", eventData);
  },

  updateEvent: async (id, eventData) => {
    return await api.put(`/events/${id}`, eventData);
  },

  deleteEvent: async (id) => {
    return await api.delete(`/events/${id}`);
  },

  getCategories: async () => {
    return await api.get("/categories");
  },

  getCategoryById: async (id) => {
    return await api.get(`/categories/${id}`);
  },

  createCategory: async (categoryData) => {
    return await api.post("/categories", categoryData);
  },

  updateCategory: async (id, categoryData) => {
    return await api.put(`/categories/${id}`, categoryData);
  },

  deleteCategory: async (id) => {
    return await api.delete(`/categories/${id}`);
  },

  purchaseTicket: async (ticketData) => {
    return await api.post("/tickets/purchase", ticketData);
  },

  // Enhanced ticket management with filters support
  getMyTickets: async (filters = {}) => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.append(key, value);
      }
    });

    return await api.get(`/tickets/my?${params.toString()}`);
  },

  // New ticket statistics endpoint
  getTicketStats: async () => {
    return await api.get("/tickets/stats");
  },

  // New ticket download functionality
  downloadTicket: async (ticketId) => {
    return await api.get(`/tickets/${ticketId}/download`, {
      responseType: "blob",
    });
  },

  getTicketById: async (id) => {
    return await api.get(`/tickets/${id}`);
  },

  cancelTicket: async (id) => {
    return await api.patch(`/tickets/${id}/cancel`);
  },

  // Ticket validation methods
  validateTicket: async (ticketNumber) => {
    return await api.get(`/tickets/validate/${ticketNumber}`);
  },

  validateBulkTickets: async (ticketNumbers) => {
    return await api.post("/tickets/validate/bulk", {
      ticket_numbers: ticketNumbers,
    });
  },

  markTicketAsUsed: async (ticketId) => {
    return await api.patch(`/tickets/${ticketId}/use`);
  },

  getEventValidationStats: async (eventId) => {
    return await api.get(`/events/${eventId}/validation-stats`);
  },

  // Discount validation (placeholder)
  validateDiscount: async (code) => {
    // Simulate discount validation
    await new Promise((resolve) => setTimeout(resolve, 500));

    const validCodes = {
      STUDENT10: { percentage: 10, description: "Student popust" },
      EARLY20: { percentage: 20, description: "Rani popust" },
      VIP15: { percentage: 15, description: "VIP popust" },
    };

    if (validCodes[code.toUpperCase()]) {
      return {
        success: true,
        data: validCodes[code.toUpperCase()],
      };
    }

    return {
      success: false,
      message: "Neispravni kod za popust",
    };
  },

  // Search suggestions
  getSearchSuggestions: async (term) => {
    return await api.get(
      `/events/search/suggestions?term=${encodeURIComponent(term)}`
    );
  },

  // Categories
  getCategoryEvents: async (categoryId, page = 1) => {
    return await api.get(`/categories/${categoryId}/events?page=${page}`);
  },

  getCategoryStatistics: async (categoryId) => {
    return await api.get(`/categories/${categoryId}/statistics`);
  },

  // Ticket cancellation
  cancelTicket: async (ticketId, data = {}) => {
    return await api.patch(`/tickets/${ticketId}/cancel`, data);
  },

  getCancellationPolicy: async (eventId) => {
    return await api.get(`/events/${eventId}/cancellation-policy`);
  },

  // QR Code management
  getTicketQRCode: async (ticketId) => {
    return await api.get(`/tickets/${ticketId}/qr-code`);
  },

  generateTicketPDF: async (ticketId) => {
    return await api.get(`/tickets/${ticketId}/pdf`);
  },

  validateQRCode: async (qrData) => {
    return await api.post("/tickets/validate-qr", { qr_data: qrData });
  },

  // Ticket validation interface
  getEventValidationStats: async (eventId) => {
    return await api.get(`/events/${eventId}/validation-stats`);
  },

  validateBulkTickets: async (ticketNumbers) => {
    return await api.post("/tickets/validate/bulk", {
      ticket_numbers: ticketNumbers,
    });
  },

  markTicketAsUsed: async (ticketId) => {
    return await api.patch(`/tickets/${ticketId}/use`);
  },
};

export default apiService;
