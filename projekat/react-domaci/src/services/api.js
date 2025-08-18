import axios from "axios";

// Create axios instance for Laravel API
const api = axios.create({
  baseURL: "http://localhost:8000/api",
  timeout: 10000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
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
        const refreshResponse = await refreshToken();
        const newToken = refreshResponse.access_token;

        localStorage.setItem("auth_token", newToken);
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

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
        "X-Requested-With": "XMLHttpRequest",
      },
      withCredentials: true,
    }
  );

  return response.data.data;
};

export const apiService = {
  // Inicijalizacija
  init: async () => {
    try {
      await axios.get("http://localhost:8000/sanctum/csrf-cookie", {
        withCredentials: true,
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });
    } catch (error) {
      console.log("CSRF cookie initialization failed:", error);
    }
  },

  // Authentication
  getCsrfCookie: async () => {
    return await axios.get("http://localhost:8000/sanctum/csrf-cookie", {
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
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

  checkAuth: async () => {
    return await api.get("/user");
  },

  // Events
  getEventsPaginated: async (queryString = "") => {
    return await api.get(`/events?${queryString}`);
  },

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
    try {
      const response = await api.get("/events?featured=true");
      return {
        success: true,
        data: response.data || [],
        message: "Featured events retrieved successfully",
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        message: error.message || "Error fetching featured events",
      };
    }
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

  // Categories
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

  // Tickets
  purchaseTicket: async (ticketData) => {
    return await api.post("/tickets/purchase", ticketData);
  },

  getMyTickets: async (filters = {}) => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.append(key, value);
      }
    });

    return await api.get(`/tickets/my?${params.toString()}`);
  },

  getTicketStats: async () => {
    return await api.get("/tickets/stats");
  },

  downloadTicket: async (ticketId) => {
    return await api.get(`/tickets/${ticketId}/download`);
  },

  getTicketById: async (id) => {
    return await api.get(`/tickets/${id}`);
  },

  cancelTicket: async (id) => {
    return await api.put(`/tickets/${id}/cancel`);
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
    return await api.put(`/tickets/${ticketId}/mark-used`);
  },

  getEventValidationStats: async (eventId) => {
    return await api.get(`/events/${eventId}/validation-stats`);
  },

  // QR Code management
  getTicketQRCode: async (ticketId) => {
    return await api.get(`/tickets/${ticketId}/qr-code`);
  },

  generateTicketPDF: async (ticketId) => {
    return await api.get(`/tickets/${ticketId}/pdf`);
  },

  validateQRCode: async (qrData) => {
    return await api.post("/tickets/validate/qr-code", { qr_data: qrData });
  },

  generateReceipt: async (ticketId) => {
    return await api.get(`/tickets/${ticketId}/receipt`);
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

  getCancellationPolicy: async (eventId) => {
    return await api.get(`/events/${eventId}/cancellation-policy`);
  },

  uploadEventImage: async (formData) => {
    return await api.post("/events/upload-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Admin Dashboard
  getAdminOverview: async () => {
    return await api.get("/admin/dashboard/overview");
  },

  getRevenueChart: async (period = 30) => {
    return await api.get(`/admin/dashboard/revenue-chart?period=${period}`);
  },

  getCategoryStats: async () => {
    return await api.get("/admin/dashboard/category-stats");
  },

  getTopEvents: async (limit = 10, sortBy = "revenue") => {
    return await api.get(
      `/admin/dashboard/top-events?limit=${limit}&sort_by=${sortBy}`
    );
  },

  getRecentActivity: async (limit = 20) => {
    return await api.get(`/admin/dashboard/recent-activity?limit=${limit}`);
  },

  getUpcomingEvents: async () => {
    return await api.get("/admin/dashboard/upcoming-events");
  },

  // Export functionality
  exportEvents: async (format = "csv") => {
    const response = await api.get(`/export/events?format=${format}`, {
      responseType: "blob",
    });
    return response;
  },

  exportTickets: async (eventId = null, format = "csv") => {
    const params = new URLSearchParams();
    if (eventId) params.append("event_id", eventId);
    params.append("format", format);

    const response = await api.get(`/export/tickets?${params.toString()}`, {
      responseType: "blob",
    });
    return response;
  },

  // Purchase history and summary
  exportPurchaseHistory: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    return await api.get(
      `/tickets/purchase-history/export?${params.toString()}`
    );
  },

  getPurchaseSummary: async (period = "last_year") => {
    return await api.get(`/tickets/purchase-summary?period=${period}`);
  },

  // Discount validation
  validateDiscount: async (code) => {
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
  // Queue methods
  joinQueue: async () => {
    const response = await api.post("/queue/join");
    return response;
  },

  checkQueueStatus: async () => {
    const response = await api.get("/queue/status");
    return response;
  },

  leaveQueue: async () => {
    const response = await api.delete("/queue/leave");
    return response;
  },

  getQueueStats: async () => {
    const response = await api.get("/queue/stats");
    return response;
  },

  // Admin queue methods
  enableQueue: async () => {
    const response = await api.post("/admin/queue/enable");
    return response;
  },

  disableQueue: async () => {
    const response = await api.post("/admin/queue/disable");
    return response;
  },

  setMaxQueueUsers: async (maxUsers) => {
    const response = await api.post("/admin/queue/max-users", {
      max_users: maxUsers,
    });
    return response;
  },

  getAdminQueueStats: async () => {
    const response = await api.get("/admin/queue/stats");
    return response;
  },

  clearWaitingQueue: async () => {
    const response = await api.delete("/admin/queue/clear-waiting");
    return response;
  },

  clearExpiredSessions: async () => {
    const response = await api.delete("/admin/queue/clear-expired");
    return response;
  },

  activateNextInQueue: async () => {
    const response = await api.post("/admin/queue/activate-next");
    return response;
  },
};

export default apiService;
