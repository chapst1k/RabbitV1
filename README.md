# 🐾 Animal Tracking Web App

A simple web application that can be run locally to track animal keeping, breeding, hatching, and health records. Designed for offline-first use with local storage and a lightweight SQLite backend.

---

## 🚀 Features

- Track animals with ID, sex, date of birth, and custom fields
- Breeding and hatching logs
- QR code generation for easy ID scanning ( Not Fully Working ) 
- Photo uploads for each animal
- Works offline and syncs with backend when online
- Simple local SQLite backend
- Docker support for easy deployment

---

## 🛠️ Setup

### 📦 Option 1: Use Docker

Clone the repo and spin everything up with Docker Compose:


- git clone https://github.com/chapst1k/RabbitV1.git
- cd animal-tracking
- docker build -t animal-tracker-app .
- docker-compose up -d

