# Movie Reservation System

Fresher-level Java Spring Boot backend project: movie browsing, show scheduling,
seat booking with JWT authentication and concurrency-safe reservations.

## Tech Stack
Java 17, Spring Boot 3.2.5, Spring Data JPA, Spring Security, JWT, MySQL, Maven.

## Prerequisites
- JDK 17
- Maven
- MySQL 8 running locally

## Setup

1. Open `src/main/resources/application.properties` and set your MySQL username/password:
   ```
   spring.datasource.username=root
   spring.datasource.password=yourpassword
   ```
   The database `movie_reservation_db` is created automatically on first run
   (`createDatabaseIfNotExist=true`), and tables are created/updated automatically
   by Hibernate (`spring.jpa.hibernate.ddl-auto=update`).

2. Run the app:
   ```
   mvn clean install
   mvn spring-boot:run
   ```
   Runs on `http://localhost:8080`.

3. On first startup, the app seeds:
   - 15 seats: A1-A5, B1-B5, C1-C5 (shared across all shows)
   - One admin account: username `admin`, password `admin123`

## Testing

Import `movie-reservation-system.postman_collection.json` into Postman. It contains
the full flow in order: register → login as user/admin → browse movies → admin adds
a movie → admin creates a show → view seats → book a seat → try booking the same
seat again (expect 409) → view booking history → unauthorized access (expect 401).
Requests 2, 3, 5, 7, and 8 auto-save the token/movieId/showId/seatId into collection
variables, so running them top to bottom "just works" without manual copy-pasting.

## API Overview

| Method | Endpoint              | Access        |
|--------|------------------------|---------------|
| POST   | /auth/register          | Public        |
| POST   | /auth/login              | Public        |
| GET    | /movies, /movies/{id}    | Public        |
| POST/PUT/DELETE | /movies/**       | ADMIN only    |
| GET    | /shows, /shows/{id}      | Public        |
| POST/PUT/DELETE | /shows/**        | ADMIN only    |
| GET    | /shows/{id}/seats         | Public        |
| POST   | /bookings                 | Authenticated |
| GET    | /bookings/my              | Authenticated |
| GET    | /bookings/{id}            | Authenticated |

All requests other than register/login/browsing need `Authorization: Bearer <token>`.
