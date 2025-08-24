# 🎟️ TicketMaster Pro - Platforma za prodaju karata za događaje

Kompletna platforma za prodaju karata izgrađena pomoću **Laravel (PHP)** i **React (JavaScript)**.

---

## 🚀 Karakteristike

### ✅ Osnovna funkcionalnost
- Autentifikacija korisnika (registracija, prijava, odjava)
- Pregled događaja sa naprednom pretragom i filtriranjem
- Kupovina karata sa generisanjem QR koda
- Funkcionalnost korpe za kupovinu
- Upravljanje i istorija korisničkih karata
- Sistem za validaciju karata

### ✅ Administratorske funkcije
- Administratorska kontrolna tabla sa analitikom
- Upravljanje događajima (CRUD operacije)
- Interfejs za validaciju karata
- Izvoz podataka (CSV/HTML)
- Praćenje i izveštavanje prihoda

### ✅ Tehničke karakteristike
- RESTful API sa Laravel Sanctum autentifikacijom
- Funkcionalnost za upload slika
- Generisanje QR kodova
- Validacija karata od strane administratora
- Keširanje radi optimizacije performansi
- Sveobuhvatno rukovanje greškama
- Responzivan React frontend
- Migracije i seederi baze podataka

---

## 🛠️ Full stack implementacija

### Backend (Laravel)
- PHP 8.2.12
- Laravel 12
- MySQL
- Laravel Sanctum (API autentifikacija)

### Frontend (React)
- React 19.1.1
- React Router v7
- Axios
- CSS3

---

## ⚙️ Instalacija

### 📌 Preduslovi
- PHP 8.2.12
- Composer
- Node.js 18+
- MySQL
- npm

---

### 🔧 Backend podešavanje

1. Klonirajte repozitorijum:

   ```bash
   git clone https://github.com/elab-development/internet-tehnologije-2024-projekat-prodajaulaznica_2021_0255
   cd projekat
   cd laravelDomaci
   ```

2. Instaliraj PHP zavisnosti:
   ```bash
   composer install
   ```

3. Kopiraj i konfigurisi .env fajl:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. Izmeni `.env` radi uvezivanja sa lokalnom bazom podataka na mySQL-u:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=ticketmaster
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   ```

5. Pokreni migracije zajedno sa svim seederima:
   ```bash
   php artisan migrate --seed
   ```

6. Zapocni server:
   ```bash
   php artisan serve
   ```

---

### 🎨 Frontend podešavanje

1. Idite u frontend direktorijum:
   ```bash
   cd projekat
   cd react-domaci
   ```

2. Instaliraj JavaScript zavisnosti:
   ```bash
   npm install
   ```

3. Zapocni React Server:
   ```bash
   npm start
   ```


