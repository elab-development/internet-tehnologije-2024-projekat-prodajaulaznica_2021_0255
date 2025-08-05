# 🎫 React - Aplikacija za prodaju karata

Drugi domaći zadatak je moderna React aplikacija za pretraživanje i kupovinu ulaznica za različite događaje. Aplikacija nudi intuitivno korisničko iskustvo sa naprednim filtriranjem, responsivnim dizajnom i state management-om.

## 📋 Pregled projekta

🔍  **Napredna pretraga**: Real-time pretraga događaja sa debounce optimizacijom.

📱  **Responsive dizajn**: Potpuno prilagođen svim uređajima (mobile-first pristup).

🛒  **Korpa sa localStorage**: Perzistentno čuvanje stavki između sesija.

🧩  **Reusable komponente**: Modularna arhitektura sa 7 komponenti za ponovnu upotrebu.

🎯  **Custom Hooks**: Napredne funkcionalnosti (useDebounce, useLocalStorage, useCart)

🗂️  **Hijerarhijska navigacija**: Breadcrumbs sistem za laku navigaciju

## 🛠️ Tehnologije

**Frontend**: React 19 

**Routing**: React Router DOM v7

**State Management**: Context API + Custom Hooks

**Styling**: CSS3 + CSS Modules

**HTTP Client**: Axios (Mock API)

**Storage**: localStorage API

**Build Tool**: Create React App

**Version Control**: Git

## 🚀 Instalacija

```bash
# 1. Kloniraj repozitorijum
git clone https://github.com/elab-development/internet-tehnologije-2024-projekat-prodajaulaznica_2021_0255/
cd react-domaci

# 2. Instaliraj zavisnosti
npm install

# 3. Pokreni development server
npm start
# Aplikacija će se pokrenuti na http://localhost:3000
```

## 📁 Struktura projekta

```
src/
├── components/
│   ├── common/             # Reusable komponente
│   │   ├── Button/            # Univerzalno dugme
│   │   ├── EventCard/         # Kartica događaja
│   │   ├── InputField/        # Input polje sa validacijom
│   │   ├── Pagination/        # Paginacija komponenta
│   │   ├── Breadcrumbs/       # Hijerarhijska navigacija
│   │   ├── Modal/             # Modalni prozori
│   │   └── LoadingSpinner/    # Loading indikatori
│   └── layout/             # Layout komponente
│       ├── Header/            # Navigacija
│       ├── Footer/            # Footer
│       └── Layout/            # Wrapper komponenta
├── pages/                  # Stranice aplikacije
│   ├── HomePage/              # Početna stranica
│   ├── EventsPage/            # Lista događaja sa filterima
│   ├── EventDetailsPage/      # Detalji jednog događaja
│   ├── CartPage/              # Korpa za kupovinu
│   ├── ProfilePage/           # Korisnički profil
│   └── LoginPage/             # Prijava korisnika
├── hooks/                  # Custom React hooks
│   ├── useDebounce.js         # Debounce optimizacija
│   └── useLocalStorage.js     # localStorage integracija
├── context/                # Context API
│   └── CartContext.js         # Globalno stanje korpe
├── services/               # API servis
    └── api.js                 # Mock API funkcije
```
## 🌐 Rutiranje


| Ruta         | Komponenta      | Opis                                      |
| :----------- | :-------------- | :---------------------------------------- |
| /            | HomePage        | Početna stranica sa featured događajima   |
| /events      | EventsPage      | Lista svih događaja sa paginacijom i filterima |
| /events/:id  | EventDetailsPage| Detalji pojedinačnog događaja             |
| /cart        | CartPage        | Korpa sa mogućnostima checkout-a          |
| /profile     | ProfilePage     | Korisnički profil (u razvoju)             |
| /login       | LoginPage       | Forma za prijavu (u razvoju)              |

## 🎯 Ključne funkcionalnosti

### 🔍 EventsPage - Napredna pretraga

-   **Real-time search**: Debounced pretraga sa 500ms kašnjenjem
-   **Kategorijski filteri**: Muzika, Sport, Pozorište, Film, Komedija
-   **Sortiranje**: Po datumu, ceni, nazivu (rastući/opadajući)
-   **Paginacija**: 4 događaja po stranici
-   **Reset filtera**: Jednim klikom nazad na početno stanje

### 🎫 EventDetailsPage - Detaljan prikaz

-   **Breadcrumbs navigacija**: Početna ▶️ Događaji ▶️ Detalji
-   **Image zoom**: Modal za uvećavanje slika
-   **Quantity selector**: Izbor broja karata (1 do max dostupnih)
-   **Dual purchase options**: "Dodaj u korpu" ili "Kupi odmah"
-   **Responsive layout**: Grid na desktop, stack na mobile

### 🛒 CartPage - Kompleksna korpa

-   **CRUD operacije**: Dodavanje, ažuriranje, uklanjanje stavki
-   **localStorage persistance**: Čuva se između sesija
-   **Checkout simulacija**: Loading states i success feedback
-   **Clear cart modal**: Potvrda pre brisanja cele korpe
-   **Order summary**: Real-time kalkulacija ukupne cene

### 🧩 Reusable komponente

-   **Button**: 5 varijanti (primary, secondary, outline, success, danger)
-   **Modal**: Portal-based sa keyboard navigation
-   **InputField**: Validacija, error states, ikone
-   **Pagination**: Customizable sa first/last page shortcuts
-   **LoadingSpinner**: Različite veličine i boje
-   **EventCard**: Compact i full varijante
-   **Breadcrumbs**: Automatic path generation

## ⚡ Performance optimizacije

**Debounced Search**: Smanjuje API pozive sa 300ms na ~2-3 poziva tokom kucanja

**localStorage Cache**: Korpa se učitava instantly iz local storage-a

**Conditional Rendering**: Breadcrumbs i komponente se renderuju samo kad su potrebni



## 🔧 Custom Hooks

### useDebounce(value, delay)
```javascript
// Optimizuje pretragu tako što čeka da korisnik završi kucanje
const debouncedSearchTerm = useDebounce(searchTerm, 500);
```

### useLocalStorage(key, initialValue)
```javascript
// Automatski sinhronizuje state sa localStorage
const [cartItems, setCartItems] = useLocalStorage('cart', []);
```

### useCart()
```javascript
// Enkapsulira svu logiku za upravljanje korpom
const { addToCart, removeFromCart, getTotalPrice } = useCart();
```

## 📄 Licenca

**Razvili**: Tamara Sarajlija 2021/0255, Jovana Stajčić 2021/0245

**Fakultet Organizacionih nauka, Internet tehnologije**

----------
