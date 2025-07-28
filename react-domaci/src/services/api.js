import axios from "axios";

// Kreiranje axios instance
const api = axios.create({
  baseURL: "https://jsonplaceholder.typicode.com",
  timeout: 10000,
});

// Mock podaci za događaje (kombinovaćemo sa JSONPlaceholder)
const mockEvents = [
  {
    id: 1,
    title: "Koncert - Bajaga i Instruktori",
    description: "Nezaboravan koncert legendarne grupe u Beogradskoj areni.",
    category: "Muzika",
    date: "2024-08-15",
    time: "20:00",
    location: "Beogradska Arena, Beograd",
    price: 3500,
    image: "https://picsum.photos/400/250?random=1",
    availableTickets: 500,
    featured: true,
  },
  {
    id: 2,
    title: "Pozorišna predstava - Hamlet",
    description: "Klasična drama u izvođenju Narodnog pozorišta.",
    category: "Pozorište",
    date: "2024-08-20",
    time: "19:30",
    location: "Narodno pozorište, Beograd",
    price: 1200,
    image: "https://picsum.photos/400/250?random=2",
    availableTickets: 200,
    featured: false,
  },
  {
    id: 3,
    title: "Fudbalska utakmica - Partizan vs Zvezda",
    description: "Večiti derbi srpskog fudbala na Marakani.",
    category: "Sport",
    date: "2024-08-25",
    time: "18:00",
    location: "Stadion Rajko Mitić, Beograd",
    price: 2000,
    image: "https://picsum.photos/400/250?random=3",
    availableTickets: 1000,
    featured: true,
  },
  {
    id: 4,
    title: "Stand-up komedija - Marko Đorđević",
    description: "Večer smeha sa jednim od najpoznatijih komičara.",
    category: "Komedija",
    date: "2024-08-30",
    time: "21:00",
    location: "Dom kulture, Novi Sad",
    price: 1500,
    image: "https://picsum.photos/400/250?random=4",
    availableTickets: 150,
    featured: false,
  },
  {
    id: 5,
    title: "Jazz festival - Nišville",
    description: "Međunarodni jazz festival sa svetskim zvezdama.",
    category: "Muzika",
    date: "2024-09-05",
    time: "19:00",
    location: "Tvrđava, Niš",
    price: 2500,
    image: "https://picsum.photos/400/250?random=5",
    availableTickets: 800,
    featured: true,
  },
  {
    id: 6,
    title: "Filmski festival - FEST",
    description: "Premijera novog srpskog filma.",
    category: "Film",
    date: "2024-09-10",
    time: "20:30",
    location: "Sava Centar, Beograd",
    price: 800,
    image: "https://picsum.photos/400/250?random=6",
    availableTickets: 300,
    featured: false,
  },
];

// API funkcije
export const apiService = {
  // Dobijanje svih događaja
  getEvents: async (page = 1, limit = 6) => {
    try {
      // Simuliramo API poziv sa delay-om
      await new Promise((resolve) => setTimeout(resolve, 500));

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedEvents = mockEvents.slice(startIndex, endIndex);

      return {
        data: paginatedEvents,
        totalEvents: mockEvents.length,
        totalPages: Math.ceil(mockEvents.length / limit),
        currentPage: page,
      };
    } catch (error) {
      throw new Error("Greška pri učitavanju događaja");
    }
  },

  // Dobijanje jednog događaja po ID
  getEventById: async (id) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const event = mockEvents.find((event) => event.id === parseInt(id));
      if (!event) {
        throw new Error("Događaj nije pronađen");
      }

      return { data: event };
    } catch (error) {
      throw new Error("Greška pri učitavanju događaja");
    }
  },

  // Pretraživanje događaja
  searchEvents: async (searchTerm, category = "all") => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));

      let filteredEvents = mockEvents;

      if (searchTerm) {
        filteredEvents = filteredEvents.filter(
          (event) =>
            event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (category !== "all") {
        filteredEvents = filteredEvents.filter(
          (event) => event.category.toLowerCase() === category.toLowerCase()
        );
      }

      return { data: filteredEvents };
    } catch (error) {
      throw new Error("Greška pri pretraživanju");
    }
  },

  // Dobijanje featured događaja
  getFeaturedEvents: async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const featuredEvents = mockEvents.filter((event) => event.featured);
      return { data: featuredEvents };
    } catch (error) {
      throw new Error("Greška pri učitavanju popularnih događaja");
    }
  },

  // Dobijanje kategorija
  getCategories: async () => {
    try {
      const categories = [
        ...new Set(mockEvents.map((event) => event.category)),
      ];
      return { data: categories };
    } catch (error) {
      throw new Error("Greška pri učitavanju kategorija");
    }
  },
};

export default apiService;
