# 🎫 Laravel - Sistem za rezervaciju ulaznica

**Prvi domaći zadatak** je sistem za upravljanje događajima i rezervaciju ulaznica, razvijen u **Laravel** framework-u. Aplikacija nudi RESTful API za mobilne i frontend aplikacije, kao i web interfejs za pregled i upravljanje.

---

### 📋 Pregled projekta

- **RESTful API**: Kompletne CRUD operacije za događaje, kategorije i ulaznice

- **Web interfejs**: Pregled događaja sa paginacijom, filtriranjem i sortiranjem

- **Autentifikacija**: Bezbedna prijava korisnika putem Laravel Sanctum-a

- **Upravljanje sadržajem**: Lako dodavanje i organizacija događaja po kategorijama

- **Rezervacije**: Sistem za kupovinu ulaznica sa podrškom za popuste

- **Validacija**: QR kodovi za brzu i laku validaciju ulaznica

---

### 🏗️ Struktura baze podataka
| Tabela       | Opis                                      | Relacije                                           |
|--------------|-------------------------------------------|----------------------------------------------------|
| `users`      | Registrovani korisnici sistema            | `User` ima više `Ticket`-a                         |
| `categories` | Kategorije događaja (muzika, sport...)    | `Category` ima više `Event`-a                      |
| `events`     | Događaji sa detaljima, cenama i slikama   | `Event` ima više `Ticket`-a, pripada `Category`    |
| `tickets`    | Rezervisane/kupljene ulaznice             | `Ticket` pripada `User`-u i `Event`-u              |
---

### 🛠️ Tehnologije

- **Backend**: Laravel 12

- **Baza podataka**: MySQL

- **Autentifikacija**: Laravel Sanctum

- **Frontend**: Blade Templates & Bootstrap 5

- **Testiranje**: Postman

- **Version Control**: Git

---

### 🚀 Instalacija

```bash

# 1. Kloniraj repozitorijum

git clone https://github.com/elab-development/internet-tehnologije-2024-projekat-prodajaulaznica_2021_0255
cd laravelDomaci

# 2. Instaliraj zavisnosti

composer install

# 3. Podesi okruženje

cp .env.example .env

php artisan key:generate

# 4. Postavi bazu podataka i popuni je

php artisan migrate:fresh --seed

# 5. Pokreni server

php artisan serve

```

---

### 📡 API Endpoints
#### Autentifikacija
| Metoda | Endpoint         | Opis                  | Auth |
|--------|------------------|-----------------------|------|
| POST   | `/api/register`  | Registracija korisnika| ❌   |
| POST   | `/api/login`     | Prijava              | ❌   |
| POST   | `/api/logout`    | Odjava               | ✔️   |

#### Događaji (`/api/events`)
| Metoda | Endpoint              | Opis                         | Auth |
|--------|-----------------------|------------------------------|------|
| GET    | `/`                   | Lista događaja (paginacija)  | ❌   |
| GET    | `/{id}`               | Detalji događaja             | ❌   |
| POST   | `/`                   | Kreiranje novog događaja     | ✔️   |
| PUT    | `/{id}`               | Ažuriranje događaja          | ✔️   |
| DELETE | `/{id}`               | Brisanje događaja            | ✔️   |
| GET    | `/category/{id}`      | Događaji po kategoriji       | ❌   |
| GET    | `/{id}/tickets`       | Ulaznice za događaj          | ❌   |

#### Kategorije (`/api/categories`)
| Metoda | Endpoint  | Opis                  | Auth |
|--------|-----------|-----------------------|------|
| GET    | `/`       | Lista kategorija      | ❌   |
| GET    | `/{id}`   | Detalji kategorije    | ❌   |
| POST   | `/`       | Kreiranje kategorije  | ✔️   |
| PUT    | `/{id}`   | Ažuriranje kategorije | ✔️   |
| DELETE | `/{id}`   | Brisanje kategorije   | ✔️   |

#### Ulaznice (`/api/tickets`)
| Metoda | Endpoint            | Opis                     | Auth |
|--------|---------------------|--------------------------|------|
| POST   | `/purchase`         | Kupovina ulaznice        | ✔️   |
| GET    | `/my`               | Moje ulaznice            | ✔️   |
| GET    | `/{id}`             | Detalji ulaznice         | ✔️   |
| PATCH  | `/{id}/cancel`      | Otkazivanje ulaznice     | ✔️   |
| GET    | `/validate/{number}`| Validacija ulaznice      | ❌   |

---

### 🌐 Web Interface
Javne stranice omogućavaju pregled događaja i kategorija sa naprednim filtriranjem, sortiranjem i paginacijom:
- `/` - Početna stranica
- `/events` - Lista svih događaja
- `/categories` - Lista kategorija

---

### 🎯 Ključne funkcionalnosti
- **API**: 
  - JWT Autentifikacija (Sanctum)
  - Resource kontroleri
  - JSON odgovori sa validacijom
  - Generisanje QR kodova
- **Web**:
  - Responsive dizajn (Bootstrap 5)
  - Napredna paginacija
  - Multi-filter pretraga
  - Dinamičko sortiranje
- **Poslovna logika**:
  - Automatsko upravljanje zalihama ulaznica
  - Sistem popusta
  - Praćenje statusa događaja
  - Validacija ulaznica

---

### 📄 Licenca
```text

Razvili: Tamara Sarajlija 2021/0255, Jovana Stajčić 2021/0245.
Fakultet Organizacionih nauka, Internet tehnologije

```
