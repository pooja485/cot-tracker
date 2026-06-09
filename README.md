# COT — Company Outreach Tracker

A full-stack company outreach management system built with Node.js, Express, SQLite, and vanilla JS.

---

## 📁 Project Structure

```
cot-tracker/
├── backend/
│   ├── server.js          ← Express server (entry point)
│   ├── db.js              ← Database layer (sql.js / SQLite)
│   ├── seed.js            ← Seed script with demo data
│   └── routes/
│       ├── companies.js   ← Company CRUD API
│       └── activity.js    ← Activity log API
├── frontend/
│   └── public/
│       └── index.html     ← Full frontend (HTML + CSS + JS)
├── data/                  ← Auto-created; holds cot.db (SQLite file)
├── .env                   ← Environment variables
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Setup & Run

### Prerequisites
- Node.js v16 or higher  
- npm

### 1. Install dependencies
```bash
npm install
```

### 2. Seed demo data (first time only)
```bash
npm run seed
```

### 3. Start the server
```bash
npm start
```

The app will be live at **http://localhost:3000**

### 4. Development mode (auto-restart on file changes)
```bash
npm run dev
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies` | List all companies (with optional filters) |
| POST | `/api/companies` | Create a new company |
| GET | `/api/companies/:id` | Get single company |
| PUT | `/api/companies/:id` | Update a company |
| DELETE | `/api/companies/:id` | Delete a company |
| GET | `/api/companies/stats` | Aggregate statistics & analytics |
| GET | `/api/activity` | Recent activity log |
| GET | `/api/health` | Server health check |

### Query Parameters for GET /api/companies
- `search` — text search (company, contact, email, city)
- `status` — filter by status
- `industry` — filter by industry
- `assigned` — filter by team member

---

## 🗄️ Database

- Uses **SQLite** via `sql.js` (no native build required)
- Database file saved at `data/cot.db`
- Auto-created on first run
- Two tables: `companies` and `activity_log`

---

## 🌍 Deployment

### Option A — Deploy on a VPS (Ubuntu/Debian)

```bash
# 1. Upload project to server (exclude node_modules and data/)
scp -r ./cot-tracker user@your-server:/var/www/

# 2. On the server
cd /var/www/cot-tracker
npm install
npm run seed   # first time only

# 3. Use PM2 to keep it running
npm install -g pm2
pm2 start backend/server.js --name "cot-tracker"
pm2 save
pm2 startup

# 4. Set up Nginx reverse proxy
# See nginx.conf section below
```

### Option B — Deploy on Render / Railway / Fly.io

1. Push code to GitHub (ensure `data/` is in `.gitignore`)
2. Set environment variable `PORT` on the platform
3. Build command: `npm install`
4. Start command: `npm start`
5. Run seed via the platform's shell: `npm run seed`

### Nginx Config (for VPS deployment)
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment |

---

## 👥 Team Members (default)
- James Dawson — Sales Manager (Admin)
- Sarah Kim — Senior Sales Rep
- Ali Raza — Sales Rep
- Nina Patel — Business Development
- Tom Brooks — Account Executive

To change team members, update `TEAM` in `frontend/public/index.html` and the select options in the form.

---

## 📊 Features
- ✅ Dashboard with live stats and analytics
- ✅ Company CRUD (Add / Edit / Delete / View)
- ✅ Real-time search and filters
- ✅ Follow-up calendar with overdue alerts
- ✅ Status tracker (Kanban-style view)
- ✅ Reports with bar charts
- ✅ CSV Export
- ✅ Activity log
- ✅ Dark mode
- ✅ Persistent SQLite database
- ✅ Mobile responsive
