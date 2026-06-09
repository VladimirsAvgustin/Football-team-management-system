# Sports Team Management System

TeamFlow is a web application for sports clubs and teams. It helps coaches, managers, administrators and players organize team work in one place: team rosters, schedules, attendance, player statistics and communication.

## Features

- User registration, login and password reset
- Role-based access for administrators, coaches and players
- Team creation, joining by team code and coach join requests
- Team dashboard with upcoming events and recent activity
- Training and match schedule management
- Attendance tracking for training events
- Player roster management and individual player statistics
- Team statistics with match, goal, assist, card and attendance summaries
- Team chat rooms, direct messages, typing indicators and file attachments
- Profile avatars and team logo upload
- Admin panel for managing users and teams
- Latvian and English UI translations

## Tech Stack

- Frontend: Vue 3, Vite, Vue Router, Pinia, vue-i18n
- UI/data features: FullCalendar, Chart.js, dayjs
- Backend: Node.js, Express, Socket.io, JWT, bcrypt, Nodemailer
- Database: SQLite
- Deployment/development: Docker Compose

## Project Structure

```text
.
|-- backend/              # Express API, Socket.io server, SQLite database setup
|   |-- routes/           # Auth, admin, schedule and chat routes
|   |-- migrations/       # Database migration helpers
|   `-- server.js         # Backend entry point
|-- frontend/             # Vue 3 + Vite client
|   |-- public/           # Static frontend assets
|   `-- src/              # Views, components, stores, router and locales
|-- docker-compose.yml    # Local Docker setup
|-- .env.example          # Example environment variables
`-- package.json          # Root Docker helper scripts
```

## Environment Variables

Copy `.env.example` to `.env` before running with Docker:

```bash
cp .env.example .env
```

For local backend development without Docker, put the same variables in `backend/.env`, because the backend loads environment variables from the backend directory.

Available variables:

| Variable | Description |
| --- | --- |
| `FRONTEND_URL` | Frontend origin used for links and CORS, for example `http://localhost:5173`. |
| `JWT_SECRET` | Secret used for signing JWT authentication tokens. |
| `EMAIL_USER` | Email account used by the contact form and password reset emails. |
| `EMAIL_PASS` | App password or SMTP password for `EMAIL_USER`. |

Email variables are optional for basic local usage, but contact and password reset email delivery require them.

## Start With Docker

1. Create the environment file:

```bash
cp .env.example .env
```

2. Start the full application:

```bash
docker compose up --build
```

Or use the root npm helper:

```bash
npm run docker:up
```

3. Open the app:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

Stop containers:

```bash
docker compose down
```

Or:

```bash
npm run docker:down
```

## Local Development

Install and run the backend:

```bash
cd backend
npm install
npm run dev
```

Install and run the frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server proxies `/api` requests to the backend. By default it uses `http://127.0.0.1:3000`; override it with `VITE_API_PROXY_TARGET` when needed.

## Useful Commands

```bash
# Root
npm run docker:up
npm run docker:down

# Backend
cd backend
npm run start
npm run dev

# Frontend
cd frontend
npm run dev
npm run build
npm run preview
```

## API Overview

Main API groups:

- `/api/auth/*` - registration, login, profile, teams, player stats and team membership
- `/api/admin/*` - admin-only user and team management
- `/api/teams/:id/schedule` - team schedule CRUD
- `/api/teams/:teamId/events/:eventId/attendance` - attendance management
- `/api/chat/*` - chat rooms, messages, direct messages and attachments
- `/api/contact` - contact form email endpoint

## Database

The backend uses SQLite. During development, the database file is stored at `backend/database.sqlite`. Required tables are created automatically when the backend starts, including users, teams, schedules, attendance, player statistics, chat rooms, messages, direct messages and password reset tokens.
