# QuickMed - Modern Healthcare Management Platform

QuickMed is a comprehensive, full-stack healthcare management system designed to streamline operations for clinics, hospitals, and private practices while providing a seamless health management experience for patients.

## Who is this platform for?

QuickMed is built for three primary user groups:

1.  **Clinics & Healthcare Centers**: Provides a robust administrative backend for receptionists to manage front-office operations, patient flow, and financial tracking.
2.  **Doctors & Medical Practitioners**: Offers a sophisticated workspace for managing daily schedules, conducting consultations, maintaining electronic medical records (EMR), and issuing digital prescriptions.
3.  **Patients**: A user-friendly portal to discover doctors, book and manage appointments, and access medical history and prescriptions.

---

## Key Features

### 🏢 For Clinics & Receptionists
*   **Advanced Appointment Management**: Centralized dashboard to view, filter, and schedule appointments across all doctors.
*   **Patient In-take Workflow**: Quick check-in process, marking patient arrivals, and capturing vital initial information.
*   **Payment Tracking**: Integrated payment status monitoring for consultations and services.
*   **Resource Scheduling**: Efficient management of doctor availability and clinic slots.

### 🩺 For Doctors
*   **Smart Scheduling**: Dynamic slot generation based on customizable working days, hours, and appointment durations.
*   **Electronic Medical Records (EMR)**: Securely upload and manage lab results, imaging reports (PDF/Images), and clinical notes.
*   **Digital Prescriptions**: Streamlined prescribing workflow with automated patient data syncing from appointments.
*   **Real-time Interaction**: Built-in messaging system for patient communication and follow-ups.

### 👤 For Patients
*   **Doctor Discovery**: Browse doctors by specialty and view real-time availability.
*   **Seamless Booking**: Intuitive calendar-based booking system with instant slot confirmation.
*   **Health Dashboard**: One-stop access to prescription history, medical records, and upcoming appointments.
*   **Secure Payments**: Integrated Stripe payment gateway for hassle-free service payments.

---

## Tech Stack

### Backend
*   **Framework**: [NestJS](https://nestjs.com/) (Node.js)
*   **Language**: TypeScript
*   **Database**: PostgreSQL with [TypeORM](https://typeorm.io/)
*   **Authentication**: Passport.js with JWT
*   **Real-time**: Socket.io for instant notifications and messaging
*   **File Storage**: Cloudinary & Multer for medical document management
*   **Payments**: Stripe API integration
*   **Email**: SendGrid for notifications

### Frontend
*   **Framework**: [Angular](https://angular.io/) (v17+)
*   **Styling**: SCSS, Bootstrap, and Tailwind CSS
*   **UI Components**: Angular Material & NG Bootstrap
*   **State Management**: RxJS

---

## Getting Started

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL
*   npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone [repository-url]
    cd QuickMed
    ```

2.  **Backend Setup**
    ```bash
    cd backend
    npm install
    # Configure your .env file with DB, Stripe, and Cloudinary credentials
    npm run start:dev
    ```

3.  **Frontend Setup**
    ```bash
    cd ../frontend
    npm install
    npm run start
    ```

## Architecture

QuickMed follows a clean, modular architecture:
*   **Backend**: Organized by features (Appointments, Schedules, Medical Records, Prescriptions, etc.) using NestJS modules.
*   **Frontend**: Feature-based routing with lazy loading, shared services for core logic, and standalone components for modern Angular development.

---

## License

This project is licensed under the ISC License.
