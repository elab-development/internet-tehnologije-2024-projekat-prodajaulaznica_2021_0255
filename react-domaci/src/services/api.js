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
  {
    id: 7,
    title: "Izložba - Remek-djela impresionizma",
    description: "Kolekcija poznatih impresionističkih slika.",
    category: "Umetnost",
    date: "2024-09-12",
    time: "10:00",
    location: "Muzej savremene umetnosti, Beograd",
    price: 700,
    image: "https://picsum.photos/400/250?random=7",
    availableTickets: 400,
    featured: false,
  },
  {
    id: 8,
    title: "Koncert - E-Play",
    description: "Nastup popularnog alternativnog benda u klubu.",
    category: "Muzika",
    date: "2024-09-18",
    time: "22:00",
    location: "Klub Dragstor, Beograd",
    price: 1800,
    image: "https://picsum.photos/400/250?random=8",
    availableTickets: 250,
    featured: false,
  },
  {
    id: 9,
    title: "Košarkaška utakmica - Srbija vs Hrvatska",
    description: "Prijateljska utakmica reprezentacija.",
    category: "Sport",
    date: "2024-09-22",
    time: "19:00",
    location: "Štark Arena, Beograd",
    price: 2500,
    image: "https://picsum.photos/400/250?random=9",
    availableTickets: 600,
    featured: true,
  },
  {
    id: 10,
    title: "Dečija predstava - Mačak u čizmama",
    description: "Omiljena bajka za najmlađe.",
    category: "Pozorište",
    date: "2024-09-28",
    time: "11:00",
    location: "Pozorište Boško Buha, Beograd",
    price: 600,
    image: "https://picsum.photos/400/250?random=10",
    availableTickets: 180,
    featured: false,
  },
  {
    id: 11,
    title: "Sajam knjiga",
    description: "Tradicionalni beogradski sajam knjiga.",
    category: "Kultura",
    date: "2024-10-20",
    time: "10:00",
    location: "Beogradski sajam, Beograd",
    price: 300,
    image: "https://picsum.photos/400/250?random=11",
    availableTickets: 2000,
    featured: true,
  },
  {
    id: 12,
    title: "Koncert klasične muzike - Beogradska filharmonija",
    description: "Veče sa simfonijskim orkestrom.",
    category: "Muzika",
    date: "2024-10-25",
    time: "20:00",
    location: "Kolarčeva zadužbina, Beograd",
    price: 1500,
    image: "https://picsum.photos/400/250?random=12",
    availableTickets: 300,
    featured: false,
  },
  {
    id: 13,
    title: "Maraton - Beogradski maraton",
    description: "Međunarodni atletski događaj.",
    category: "Sport",
    date: "2024-11-03",
    time: "09:00",
    location: "Centar Beograda, Beograd",
    price: 0, // Učešće se plaća, ali ulaz za gledaoce je besplatan
    image: "https://picsum.photos/400/250?random=13",
    availableTickets: 50000, // Veliki broj gledalaca
    featured: true,
  },
  {
    id: 14,
    title: "Gostujuća predstava - Nacionalni balet Kine",
    description: "Spektakularan baletski performans.",
    category: "Pozorište",
    date: "2024-11-10",
    time: "19:00",
    location: "Madlenianum, Zemun",
    price: 3000,
    image: "https://picsum.photos/400/250?random=14",
    availableTickets: 100,
    featured: false,
  },
  {
    id: 15,
    title: "Konferencija - Digitalni marketing 2024",
    description: "Vodeći stručnjaci dele znanje o digitalnim trendovima.",
    category: "Edukacija",
    date: "2024-11-15",
    time: "09:00",
    location: "Hotel Hyatt Regency, Beograd",
    price: 8000,
    image: "https://picsum.photos/400/250?random=15",
    availableTickets: 150,
    featured: false,
  },
  {
    id: 16,
    title: "Festival piva - Oktoberfest Beograd",
    description: "Najveći festival piva u regionu.",
    category: "Festival",
    date: "2024-09-20",
    time: "17:00",
    location: "Savamala, Beograd",
    price: 500,
    image: "https://picsum.photos/400/250?random=16",
    availableTickets: 1000,
    featured: true,
  },
  {
    id: 17,
    title: "Izložba pasa - CACIB Beograd",
    description: "Međunarodna izložba pasa svih rasa.",
    category: "Ostalo",
    date: "2024-10-05",
    time: "09:00",
    location: "Beogradski sajam, Beograd",
    price: 400,
    image: "https://picsum.photos/400/250?random=17",
    availableTickets: 700,
    featured: false,
  },
  {
    id: 18,
    title: "Koncert - Gibonni",
    description: "Romantično veče uz hitove poznatog kantautora.",
    category: "Muzika",
    date: "2024-12-01",
    time: "20:30",
    location: "Srpsko narodno pozorište, Novi Sad",
    price: 3800,
    image: "https://picsum.photos/400/250?random=18",
    availableTickets: 350,
    featured: true,
  },
  {
    id: 19,
    title: "Novogodišnji sajam - Grad otvorenog srca",
    description: "Praznična atmosfera, pokloni i zabava za celu porodicu.",
    category: "Festival",
    date: "2024-12-25",
    time: "10:00",
    location: "Trg Republike, Beograd",
    price: 0,
    image: "https://picsum.photos/400/250?random=19",
    availableTickets: 10000,
    featured: true,
  },
  {
    id: 20,
    title: "Pozorišna predstava - Koštana",
    description: "Vranjanska drama Bore Stankovića.",
    category: "Pozorište",
    date: "2025-01-10",
    time: "19:00",
    location: "Narodno pozorište, Niš",
    price: 1000,
    image: "https://picsum.photos/400/250?random=20",
    availableTickets: 180,
    featured: false,
  },
  {
    id: 21,
    title: "Hokejaška utakmica - KHL liga",
    description: "Uzbudljiv meč hokeja na ledu.",
    category: "Sport",
    date: "2025-01-18",
    time: "19:00",
    location: "Ledenica Pionir, Beograd",
    price: 1200,
    image: "https://picsum.photos/400/250?random=21",
    availableTickets: 400,
    featured: false,
  },
  {
    id: 22,
    title: "Koncert - Zdravko Čolić",
    description: "Najveća regionalna zvezda ponovo u Beogradu.",
    category: "Muzika",
    date: "2025-02-14",
    time: "21:00",
    location: "Štark Arena, Beograd",
    price: 4500,
    image: "https://picsum.photos/400/250?random=22",
    availableTickets: 700,
    featured: true,
  },
  {
    id: 23,
    title: "Festival nauke",
    description: "Interaktivne radionice i eksperimenti za sve uzraste.",
    category: "Edukacija",
    date: "2025-03-01",
    time: "10:00",
    location: "Studentski park, Beograd",
    price: 200,
    image: "https://picsum.photos/400/250?random=23",
    availableTickets: 1500,
    featured: false,
  },
  {
    id: 24,
    title: "Boks meč - Državno prvenstvo",
    description: "Borba za titulu u superteškoj kategoriji.",
    category: "Sport",
    date: "2025-03-15",
    time: "20:00",
    location: "SC Pinki, Zemun",
    price: 1000,
    image: "https://picsum.photos/400/250?random=24",
    availableTickets: 250,
    featured: false,
  },
  {
    id: 25,
    title: "Modna revija - Beogradska nedelja mode",
    description: "Predstavljanje novih kolekcija domaćih dizajnera.",
    category: "Moda",
    date: "2025-04-05",
    time: "19:00",
    location: "Muzej Jugoslavije, Beograd",
    price: 1800,
    image: "https://picsum.photos/400/250?random=25",
    availableTickets: 120,
    featured: true,
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
