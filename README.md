# QR Cafe Smart Digital Ordering & Billing System

A complete QR-code based ordering and billing web application designed for cafes and restaurants with table-side ordering and central admin management.

## ☕ Key Features

- **Customer QR Ordering**: Mobile-first UI for customers to scan table QR codes, browse categories, add menu items, add custom item notes, and place orders directly to the kitchen.
- **Continuous Session Ordering**: Customers can keep adding items to their table's order until final bill settlement.
- **Admin Dashboard**:
  - Live 18-Table Grid Overview with color-coded table statuses (`Empty`, `Occupied`, `Needs Attention`).
  - Menu Management: Add/edit/delete categories and menu items, toggle sold-out availability.
  - Live Order Board with Server-Sent Events (SSE) for real-time notification of incoming orders.
  - Billing & Receipts: Generate itemized bills, apply percentage discounts, and process payments.
  - QR Code Management: Auto-generate table QR codes for printing.
- **Call Waiter Feature**: Direct notification from table to admin dashboard when assistance is needed.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (`better-sqlite3`)
- **Real-Time**: Server-Sent Events (SSE)
- **Frontend Views**: EJS Templating, Tailwind CSS, FontAwesome Icons
- **Utilities**: `qrcode`, `uuid`, `express-session`

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- npm

### 2. Installation
```bash
# Install dependencies
npm install

# Build native modules if required
npm approve-scripts better-sqlite3

# Seed initial database menu and tables
npm run seed
```

### 3. Running the Server
```bash
npm start
```

- **Admin Portal**: [http://localhost:3000/admin](http://localhost:3000/admin) (Default Credentials: `admin` / `admin123`)
- **Customer Ordering**: `http://<YOUR_LOCAL_IP>:3000/order/<TABLE_NUMBER>`

## 📁 Project Structure

```
cafe-qr-system/
├── config.js               # Central configuration (Port, Tax Rate, Admin Credentials)
├── server.js               # Main Express application entry point
├── db/
│   ├── database.js         # SQLite database schema & initialization
│   └── seed.js             # Initial menu items & categories seeder
├── middleware/
│   └── auth.js             # Session authentication middleware
├── routes/
│   ├── admin.js            # Admin page routes
│   ├── customer.js         # Customer ordering page routes
│   ├── sse.js              # Server-Sent Events stream
│   └── api/                # REST API endpoints (menu, tables, orders, billing)
├── utils/
│   ├── bill-calculator.js  # Tax & subtotal calculation logic
│   └── qr-generator.js     # Table QR code generator utility
├── views/                  # EJS template views
│   ├── admin/
│   ├── customer/
│   └── partials/
└── public/                 # Static assets (CSS, JS)
```

## 📄 License
ISC
