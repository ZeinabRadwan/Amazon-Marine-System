# Amazon Marine — UI (HTML, CSS, JS)

Static prototype / reference UI for the shipping ERP. No build step; runs in the browser with optional persistence via `localStorage`. Part of the monorepo (see root `README.md`).

---

## Overview

- **Role-based access** — Admin, Sales, Accounting, Pricing, Operations, Support, and Sales Manager, each with dedicated dashboards and permissions.
- **Unified workflow** — From client visits and SD (Shipping Details) forms through operations, shipments, invoicing, and payments.
- **Frontend-only** — No backend required.

---

## Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Role-specific KPIs, charts, and quick actions. |
| **CRM** | Client management, visit tracking, and sales follow-ups. |
| **Shipments** | Tracking, dynamic statuses (admin-configurable), notes, and status updates. |
| **SD Forms** | Shipping-details forms with submit-to-operations workflow and status flow. |
| **Operations** | Task queue, booking/transport/clearance tracking, and timelines. |
| **Invoices & Accounting** | Invoicing, payments, and partner accounts. |
| **Treasury & Expenses** | Cash flow, bank reconciliation, and expense tracking. |
| **Pricing** | Container rates, quotes, approvals, and cost viewer. |
| **Partners** | Shipping lines, transporters, and customs brokers. |
| **Reports** | Financial, sales, operations, and attendance reports with export. |
| **Documents** | Official documents, contracts, and templates. |
| **Attendance** | Check-in/out and attendance overview. |
| **Visits** | Sales visit logging and outcomes. |
| **Support (Tickets)** | Client tickets and requests (Support role). |
| **Team Performance** | Sales rep metrics and funnel (Sales Manager role). |
| **Settings** | Company settings, users, notifications, system options, and **Shipment Status Management** (add/edit/disable statuses). |

---

## Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (vanilla).
- **Styling:** Custom CSS with RTL support; Boxicons for icons.
- **State / persistence:** `localStorage` (roles, shipment statuses, operations tasks, notifications, notes).
- **Charts:** Chart.js (CDN) where used.

No server, database, or build step is required.

---

## Project Structure

```
UI/
├── index.html              # Login and role selection
├── dashboard.html          # Main dashboard (role-based view)
├── clients.html            # CRM
├── shipments.html          # Shipments and tracking
├── sd-forms.html           # SD forms
├── operations.html         # Operations tasks
├── invoices.html           # Invoices
├── accounting.html         # Accounting
├── treasury.html           # Treasury
├── expenses.html           # Expenses
├── pricing.html            # Pricing
├── cost-viewer.html        # Cost viewer
├── partners.html           # Partners
├── reports.html            # Reports
├── documents.html          # Official documents
├── attendance.html         # Attendance
├── visits.html             # Visits
├── tickets.html            # Support tickets
├── team-performance.html   # Sales team performance
├── profile.html            # User profile
├── settings.html           # System and shipment status settings
├── forgot-password.html
├── reset-password.html
├── css/
│   └── styles.css          # Global styles
├── js/
│   ├── role-auth.js        # Roles and page access
│   ├── role-sidebar-apply.js
│   ├── role-views.js       # Role-based UI (visibility, filters)
│   ├── shipment-statuses.js    # Dynamic shipment status CRUD
│   ├── sd-operations-workflow.js  # SD → Operations flow
│   └── app.js              # Modals, dropdowns, shared UI
└── logo/                   # Logo assets
```

---

## Getting Started

1. **Open in a browser**  
   Open `index.html` in a modern browser (Chrome, Firefox, Edge, Safari).

2. **Or serve the folder** (recommended for local dev):
   ```bash
   cd UI
   npx serve .
   # or: python -m http.server 8080
   ```
   Then open the URL shown (e.g. http://localhost:3000 or http://localhost:8080).

3. **Choose a role**  
   On the login screen, select a role (e.g. Admin, Sales, Operations) and click **تسجيل الدخول**.

4. **Navigate**  
   Use the sidebar to move between modules. Visible menu items depend on the selected role.

---

## Roles and Access

| Role | Focus |
|------|--------|
| **Admin** | Full access to all modules and settings. |
| **Sales** | Dashboard, CRM, SD forms, visits, shipments, pricing, reports, attendance. |
| **Accounting** | Dashboard, clients, shipments, invoices, accounting, treasury, expenses, partners, reports. |
| **Pricing** | Dashboard, clients, shipments, invoices, pricing, cost viewer, reports. |
| **Operations** | Dashboard, operations, shipments, attendance, profile, settings (no SD forms). |
| **Support** | Dashboard, CRM (read), shipments (tracking), tickets, visits, invoices (read), attendance. |
| **Sales Manager** | Dashboard, CRM, SD forms, shipments, reports, visits, team performance, attendance. |

Access is enforced in the frontend (redirect to dashboard when a page is not allowed for the current role).

---

## Shipment Statuses

Shipment statuses are configurable by Admin:

1. Go to **الإعدادات** → **حالات الشحنات**.
2. Add, edit, enable/disable, or delete statuses (name in Arabic/English, color, description).
3. Only **active** statuses appear in the Shipments page filter and in the status-update modal.
4. Badges in the shipments table use the configured colors.

Data is stored in `localStorage` under `amazonMarineShipmentStatuses`.

---

© 2026 Amazon Marine. All rights reserved.
