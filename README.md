# 📈 StellarVest — Sri Lankan Stock Portfolio Intelligence

StellarVest is a premium, mobile-responsive, full-stack stock portfolio tracking application designed for the Sri Lankan stock market (CSE). It features a clean, warm design system inspired by Claude, dynamic sector mapping, secure admin authentication, and automated Dockerized deployment.

---

## 🌟 Key Features

- **📊 Smart Dashboard**: Includes beautiful vector charts (Pie Chart for sector allocation and Bar Chart for top 5 holdings) rendered using Recharts.
- **💼 Portfolio Management**: Full CRUD interface to add, view, edit, sort, filter, and delete stock holdings.
- **🛡️ Secure Admin Workspace**: Guards routes with JWT session validation and stores credentials securely using `bcryptjs` encryption. Shows registration configurations on first-run.
- **🇱🇰 CSE Market Intelligence**: Built-in dynamic symbol analyzer that automatically maps Sri Lankan Stock Market tickers (e.g. `JKH.N0000`, `SAMP.N0000`) to their official sectors (Industrials, Financials, etc.).
- **💸 Local Currency friendly**: Fully localized for Sri Lanka using LKR (Rs.) currency presentation.
- **💾 Backup & Sync**: Quick one-click CSV export/download of portfolio state and a flexible CSV restore/upload engine.
- **📱 Mobile-First Responsive Design**: Fluid layouts that stack cleanly on mobile viewports and display responsive card modules instead of compressed tables.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Tailwind CSS v3, Recharts, Lucide Icons
- **Backend**: Node.js, Express.js, JWT (`jsonwebtoken`), Bcrypt (`bcryptjs`)
- **Database**: PostgreSQL / Neon DB
- **DevOps**: Docker, Docker Compose, GitHub Actions, Render

---

## 📂 Project Structure

```text
stock_portfolio/
├── .github/workflows/
│   └── deploy.yml            # CI/CD deployment pipeline
├── client/                   # React Frontend App
│   ├── src/
│   │   ├── App.jsx           # Main UI & State controller
│   │   ├── index.css         # Styling system & theme custom classes
│   │   └── main.jsx          # Entry point mounting
│   ├── package.json
│   └── tailwind.config.js
├── server/                   # Express Backend App
│   ├── index.js              # Database routing & auth controller
│   └── package.json
├── Dockerfile                # Multi-stage production container build
├── docker-compose.yml        # Multi-container orchestration (App + PostgreSQL)
├── init.sql                  # Automated database initializer
├── restore.sql               # Seed query containing sample portfolio records
└── .gitignore                # Security parameters excluding personal data
```

---

## 🚀 Local Quickstart (Docker Compose)

The easiest way to run the entire stack (Database + Backend + Frontend) is via Docker Compose:

1. **Start the Containers**:
   ```bash
   docker-compose up --build
   ```
2. **Access the App**:
   Open your browser and navigate to: **`http://localhost:3000`**
3. **Configure Admin Workspace**:
   On your first visit, you will be prompted to register the admin username and password. This account is saved directly to your local database container.

---

## 💻 Manual Development Setup (No Docker)

If you prefer to run the components independently on your host machine:

### Prerequisites
- Node.js (v18+)
- PostgreSQL Server (running on port `5432`) or a Neon DB instance

### 1. Database Setup
Create a database named `portfolio_db` and run the queries inside [init.sql](file:///D:/Programmes/stock_portfolio/init.sql) or import [restore.sql](file:///D:/Programmes/stock_portfolio/restore.sql).

### 2. Backend Server
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set environment variables (or configure a local `.env` file):
   ```text
   DATABASE_URL=postgresql://postgres:password@localhost:5432/portfolio_db
   PORT=5000
   ```
4. Start the server:
   ```bash
   npm start
   ```

### 3. Frontend Client
1. Navigate to the client folder in a new terminal:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open the development address: **`http://localhost:3000`** (Vite proxies API calls to port `5000`).

---

## 📥 Restoring Sample Data (CSE Portfolio)

StellarVest includes smart dynamic mapping for your CSE CSV files:

1. Log in to your StellarVest dashboard.
2. Go to the **Backup & Restore** tab.
3. Click **Select CSV File to Restore** and select your [portfolio_data.csv](file:///D:/Programmes/stock_portfolio/portfolio_data.csv).
4. The system will parse your holdings, import them, and automatically map tickers to their respective sectors under Sri Lankan market definitions.

---

## 🚢 Automated CI/CD Deployment

We have configured an automated GitHub Actions pipeline to compile the production build, push it to Docker Hub, and deploy it to Render:

### Secrets Configuration
In your GitHub repository, navigate to **Settings** -> **Secrets and variables** -> **Actions** and create these secrets:
- `DOCKERHUB_USERNAME`: Your Docker Hub username.
- `DOCKERHUB_TOKEN`: Your Docker Hub Access Token.
- `RENDER_DEPLOY_HOOK_URL`: The Deploy Webhook URL copied from Render's dashboard.

### Render Setup
1. Create a **Web Service** on Render, pointing to your Docker Hub repository image: `docker.io/<your-username>/stellarvest:latest`.
2. Configure database connection environment variables under Render's Web Service settings.
3. Once the initial build is pushed, Render will deploy the application automatically on every git push to the `main` branch.
