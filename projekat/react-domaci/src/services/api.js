import axios from "axios";

// Create axios instance for Laravel API
const api = axios.create({
  baseURL: "http://localhost:8000/api",
  timeout: 10000,
  withCredentials: true, // Important for Sanctum
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response.data; // Return standardized API response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error.response?.data || error);
  }
);

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

  // Events
  getEvents: async (page = 1, limit = 6) => {
    const response = await api.get(`/events?page=${page}&limit=${limit}`);
    return {
      data: response.data || [],
      totalEvents: response.data?.length || 0,
      totalPages: Math.ceil((response.data?.length || 0) / limit),
      currentPage: page,
    };
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

  getMyTickets: async () => {
    return await api.get("/tickets/my");
  },

  getTicketById: async (id) => {
    return await api.get(`/tickets/${id}`);
  },

  cancelTicket: async (id) => {
    return await api.patch(`/tickets/${id}/cancel`);
  },

  validateTicket: async (ticketNumber) => {
    return await api.get(`/tickets/validate/${ticketNumber}`);
  },
};

export default apiService;
