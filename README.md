# Amazon Marine ERP

Full-stack ERP system for shipping companies, designed to centralize operations, CRM, sales, accounting, treasury, pricing, reporting, expenses, official documents, attendance, and client visits. Built with React frontend, Laravel backend, and modular HTML/CSS/JS.

## Features

- **Dashboard** – Role-based overview for Admin, Sales, Accounting, Pricing, Operations, and Support.  
- **CRM & Sales** – Client management, visit tracking, SD forms, sales pipeline, follow-ups.  
- **Shipments & Operations** – Shipment tracking, dynamic status system, notes & tasks, operations management.  
- **Accounting & Treasury** – Invoices, payments, cash flow, partner accounts, bank reconciliation.  
- **Pricing Module** – Container rates, quotes, approvals, SLA tracking.  
- **Expenses** – Track shipment and general expenses with reports.  
- **Partners & Vendors** – Shipping lines, transport companies, customs brokers management.  
- **Reports & Analytics** – Financial, sales, operations, attendance, and visit reports with exports.  
- **Official Documents** – Upload and manage contracts, licenses, insurance, templates.  
- **Attendance & Visits** – Employee check-in/out, late/absent tracking, sales visits logging.

## Tech Stack

- **Frontend UI** – Modular HTML/CSS/JS components  
- **React Frontend** – Dynamic dashboards, forms, and reporting  
- **Backend** – Laravel API for business logic, database, and authentication  
- **Storage & Local Logic** – LocalStorage for shipment notes/tasks and dynamic status system  

## Structure

- `/ui` – HTML, CSS, JS static components  
- `/front` – React frontend for dashboards and dynamic interactions  
- `/back` – Laravel backend for API, database, and server logic  

## Installation

1. Clone repository:  
```bash
git clone <repo-url>```

2. Install backend dependencies (Laravel):
```bash
cd back
composer install
cp .env.example .env
php artisan key:generate```

3. Install frontend dependencies (React):
```bash
cd front
npm install
npm start```

4. Open /ui folder for static components preview.

## Usage
- Admin manages all modules.
- Sales, Accounting, Pricing, Operations, and Support have role-specific dashboards and access.
- Shipments have dynamic statuses and a note/task system for better tracking.
- Reports are exportable to Excel/PDF.
