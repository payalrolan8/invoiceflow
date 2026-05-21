<div align="center">

# InvoiceFlow

### Payment reminders for small businesses — without the spreadsheet chaos.

Track customers • Manage invoices • Send email reminders

<br/>

<img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
<img src="https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" />
<img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
<img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />

<br/><br/>

<a href="https://vercel.com">
  <img src="https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel" />
</a>

<a href="https://railway.app">
  <img src="https://img.shields.io/badge/Backend-Railway-6247AA?style=flat-square&logo=railway" />
</a>

</div>

---

## What is InvoiceFlow?

InvoiceFlow is a mini payment reminder system built for small businesses. It lets you:

- **See the full picture** — dashboard with total revenue, outstanding amounts, and overdue totals
- **Manage customers** — create records, view per-customer invoice history and payment totals
- **Track invoices** — full lifecycle from `Draft → Sent → Pending → Paid / Overdue / Cancelled`
- **Send reminders** — email customers individually or in bulk, with an editable compose modal before each send
- **Responsive UI** — works on desktop and mobile

---

## Live Demo

🔗 [invoiceflow-vert.vercel.app](https://invoiceflow-vert.vercel.app)

---

## Screenshots

### Dashboard
<img width="1000" alt="Dashboard" src="https://github.com/user-attachments/assets/5fe2e728-f4c6-4bb5-85bf-0d2ecf982876" />

<br/>

### Invoices
<img width="1000" alt="Invoices" src="https://github.com/user-attachments/assets/0d180f6f-5c7d-48c7-887a-617cdcaf95d6" />

<br/>

### Invoice Detail
<img width="450" alt="Invoice Detail" src="https://github.com/user-attachments/assets/f239c532-652f-4b3a-add3-99c4d7eef3d7" />

<br/>

### Customers
<img width="1000" alt="Customers" src="https://github.com/user-attachments/assets/607b4be3-edc1-4654-8130-5468de9d6998" />

<br/>

### Reminders
<img width="1000" alt="Reminders" src="https://github.com/user-attachments/assets/8ddcac7f-c82a-45e3-964b-897787fdd0b4" />

---

## Tech Stack

| | Frontend | Backend |
|---|---|---|
| **Framework** | React 19 + Vite 8 | Node.js + Express |
| **Styling** | Bootstrap 5 + CSS Modules | — |
| **Database** | — | MongoDB via Mongoose |
| **Email** | — | Resend API |
| **Hosting** | Vercel | Railway (Nixpacks) |

---

## Project Structure

```bash
invoiceflow/
├── backend/
│   ├── config/
│   │   ├── db.js
│   │   └── mailer.js
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── Customer.js
│   │   └── Invoice.js
│   ├── routes/
│   │   ├── customers.js
│   │   ├── invoices.js
│   │   ├── reminders.js
│   │   └── dashboard.js
│   ├── .env.example
│   └── server.js
│
└── frontend/
    └── src/
        ├── api/
        │   ├── client.js
        │   ├── customers.js
        │   ├── invoices.js
        │   ├── reminders.js
        │   └── dashboard.js
        ├── components/
        │   ├── Sidebar.jsx
        │   ├── Topbar.jsx
        │   ├── InvoiceDrawer.jsx
        │   ├── StatCard.jsx
        │   ├── StatusBadge.jsx
        │   ├── Card.jsx
        │   └── Icons.jsx
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── Customers.jsx
        │   ├── CustomerDetail.jsx
        │   ├── Invoices.jsx
        │   └── Reminders.jsx
        ├── styles/global.css
        ├── App.jsx
        └── main.jsx
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB — [Atlas free tier](https://www.mongodb.com/cloud/atlas) or local
- Resend account — [resend.com](https://resend.com)

### 1 — Clone

```bash
git clone https://github.com/payalrolan8/invoiceflow.git
cd invoiceflow
```

### 2 — Configure environment

```bash
cd backend
cp .env.example .env
```

```dotenv
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/invoiceflow
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
FROM_EMAIL=onboarding@resend.dev
ALLOWED_ORIGINS=http://localhost:5173
TEST_EMAIL=your-dev-email@example.com
```

### 3 — Run

```bash
# Terminal 1 — backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm install && npm run dev
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `RESEND_API_KEY` | ✅ | API key from resend.com |
| `FROM_EMAIL` | ✅ | Sender address (`onboarding@resend.dev` in dev) |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated frontend URLs for CORS |
| `PORT` | — | Defaults to `5000` |
| `TEST_EMAIL` | — | If set, all emails redirect here instead of real customers |

---

## API Reference

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server status |
| `GET` | `/api/dashboard` | Aggregated stats + recent invoices |

### Customers
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/customers` | List all |
| `GET` | `/api/customers/:id` | Single customer |
| `POST` | `/api/customers` | Create |
| `PUT` | `/api/customers/:id` | Update |
| `PATCH` | `/api/customers/:id/status` | Update status |
| `DELETE` | `/api/customers/:id` | Delete |

### Invoices
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/invoices` | List — supports `?status=` and `?search=` |
| `GET` | `/api/invoices/stats` | Counts + amounts by status |
| `GET` | `/api/invoices/:id` | Single invoice |
| `POST` | `/api/invoices` | Create |
| `PUT` | `/api/invoices/:id` | Update |
| `PATCH` | `/api/invoices/:id/status` | Status change |
| `DELETE` | `/api/invoices/:id` | Delete |

### Reminders
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/reminders` | Queue + stats |
| `POST` | `/api/reminders/webhook` | Resend webhook for open tracking |
| `POST` | `/api/reminders/send-all` | Bulk send |
| `POST` | `/api/reminders/:id/send` | Send one reminder |

---

## Deployment

**Backend → Railway:** Push `backend/` — Nixpacks auto-detects Node, runs `npm install`, starts `node server.js`. Set env vars in the Railway dashboard.

**Frontend → Vercel:** Point at `frontend/` — Vite is auto-detected. Add one env var:

```env
VITE_API_URL=https://your-app.up.railway.app/api
```

---

## Future Work

- PDF export for dashboard analytics
- Settings page (business name, default tax rate, email templates)

---

## 📄 Project Writeup

[View pdf (PDF)](./InvoiceFlow.pdf)
