# AGENTS.md — Academy Desk (team NRG)

This file is the single source of truth for this project. **Humans and AI agents must read it before starting work and update it when a decision changes.** If code and this file disagree, fix one of them in the same commit.

---

## 1. What we are building

A web desk for sports academies. Each academy signs up on its own and only ever sees its own data. It replaces the coach's notebook:

- The coach keeps a list of players.
- The coach runs practice sessions and marks who came.
- The coach records matches and each player's score.
- The app works out who is **Ready** (for a trial), and shows it to a scout.

Three kinds of login: **coach**, **player**, **scout**.

Out of scope, do not build: payments, video, mobile app, chat, WhatsApp, maps.

---

## 2. Tech and architecture

The repo has **two separate apps in two folders**. They share nothing except the API contract in §4–§5.

```
vibe-coding-challenge-2-0-nrg/
  AGENTS.md
  CLAUDE.md
  backend/     Node.js + Express, plain JavaScript   (Suraj)
  frontend/    Next.js + TypeScript + Tailwind       (teammate)
```

| Part | Backend (`backend/`) | Frontend (`frontend/`) |
|---|---|---|
| Language | Plain JavaScript (ES modules, `"type": "module"`), **no TypeScript, no Next.js** | TypeScript |
| Framework | Express | Next.js (App Router, `src/` dir) |
| Database | MongoDB Atlas via Mongoose | – (never talks to Mongo directly) |
| Auth | bcryptjs hash, `jsonwebtoken` JWT in an httpOnly cookie, `cookie-parser` | sends the cookie automatically |
| Local port | `http://localhost:4000` | `http://localhost:3000` |
| Hosting | Vercel project #1, root dir `backend/` | Vercel project #2, root dir `frontend/` (this is the live URL) |

### How the two talk

The browser **only ever talks to the frontend**. Next.js forwards every `/api/*` request to the backend with a rewrite:

```js
// frontend/next.config.(js|ts)
async rewrites() {
  return [{ source: "/api/:path*", destination: `${process.env.BACKEND_URL}/api/:path*` }];
}
```

So the frontend calls `fetch("/api/players")` (relative URL), and the login cookie lives on the frontend's domain. No CORS and no cross-site cookie problems. The backend still enables CORS for `http://localhost:3000` only as a dev convenience.

### Environment variables (never committed; `.env.example` in each folder)

`backend/.env`
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<long random string>
PORT=4000
CLOUDINARY_CLOUD_NAME=<from the Cloudinary dashboard>
CLOUDINARY_API_KEY=<from the Cloudinary dashboard>
CLOUDINARY_API_SECRET=<from the Cloudinary dashboard, never commit or paste it anywhere>
```

`frontend/.env.local`
```
BACKEND_URL=http://localhost:4000      # in Vercel: the backend's Vercel URL
NEXT_PUBLIC_USE_MOCKS=false            # true = use mock data, no backend needed
```

---

## 3. Business rules (decided)

These are the rules the code must follow. Marked **[decision]** where we chose a default. Change here first if the team disagrees.

### Academies
| Method | Path | Who | Body | Result |
|---|---|---|---|---|
| GET | `/api/academies` | anyone | – | 200 `{ academies: AcademyListItem[] }`, names and towns only (for scout sign-up) |
| GET | `/api/academy` | logged in | – | 200 `{ academy: AcademySummary }` |
| PATCH | `/api/academy` | coach | `{ name?, town? (null or "" clears), sports? }` | 200 `{ academy }`. 409 if the name is taken, or if a removed sport still has players (`details.stillUsed`) |

### Coach accounts (coach only, own academy)
| Method | Path | Who | Body | Result |
|---|---|---|---|---|
| GET | `/api/users/coaches` | coach | – | 200 `{ coaches: CoachAccount[] }`, oldest first |
| POST | `/api/users/coaches` | coach | `{ username, password }` | 201 `{ coach }`. 409 username taken |
| DELETE | `/api/users/coaches/:id` | coach | – | 200 `{ ok: true }`. 400 for your own account, 404 for a coach of another academy |

### Scout accounts (coach only, own academy)
| Method | Path | Who | Body | Result |
|---|---|---|---|---|
| GET | `/api/users/scouts` | coach | – | 200 `{ scouts: ScoutAccount[] }`, pending first |
| POST | `/api/users/scouts` | coach | `{ email, password }` | 201 `{ scout }` (active at once). 409 email already used |
| PATCH | `/api/users/scouts/:id/approve` | coach | – | 200 `{ scout }` with status active. 404 if not a scout |
| DELETE | `/api/users/scouts/:id` | coach | – | 200 `{ ok: true }`. Rejects a pending request or removes an active scout. Only scout accounts can be deleted here (404 otherwise) |

### Players
- Fields: name, age, sport. One academy, so no academy field.
- Only the coach adds players. Adding a player also creates that player's login (username + password).
- Each player has exactly one sport.
- **Profile (all optional):** photo, height in cm, weight in kg, nationality. **[decision]** A player edits their own profile and photo. The coach edits anyone's. A scout cannot edit.
- **Photos live in Cloudinary** (free account). The browser uploads straight to Cloudinary using a signature from our backend, then tells the backend the resulting URL. Photos never pass through Vercel, and the backend accepts only URLs from our own Cloudinary account and that player's own folder path.

### Sessions (practice)
Lifecycle: **Open → Mark → Close**.
1. **Open**: coach creates a session with a date and a sport. Its roster is every player of that sport at that moment.
2. **Mark**: each player on the roster is set to `present` or `absent`. Can be changed while the session is open.
3. **Close**: the session is locked. Any later change to it is refused (HTTP 409).
- **[decision]** Close is refused while any roster player is unmarked.
- **[decision]** One session per sport per date.

### Matches
- Fields: date, sport, opponent, and a score sheet: list of `{ player, stats }`.
- `stats` holds the numbers the sport defines (table below), each a whole number 0 to 1000. A stat left out counts as 0. A key the sport does not define is refused with 400.

| Sport | Stats recorded per player per match (`key`) |
|---|---|
| Football | `goals`, `assists` |
| Cricket | `runs`, `wickets`, `catches` |
| Badminton | `gamesWon`, `pointsWon` |
| Volleyball | `points`, `spikes`, `blocks`, `aces` |
| Kabaddi | `raidPoints`, `tacklePoints` |
| Hockey | `goals`, `assists` |
| Table Tennis | `gamesWon`, `pointsWon` |

The table lives in `backend/src/constants.js` (`SPORT_STATS`) and `frontend/src/lib/sportStats.ts`. Change both together.
- **[decision]** A player can be on the sheet only if they were marked **present** in a session of the same sport on the same date. Anyone else (absent, or no session that day) is refused with HTTP 422, and the response names the refused players.
- A player must be of the match's sport.

### Attendance and Ready
- `sessionsHeld` = closed sessions of the player's sport where the player was on the roster. **[decision]** Open sessions do not count.
- `sessionsPresent` = how many of those they were present at.
- `attendancePct` = sessionsPresent / sessionsHeld × 100 (0 if sessionsHeld is 0).
- `matchesPlayed` = matches where the player is on the score sheet.
- **Ready** = attendance ≥ 75% **and** matchesPlayed ≥ 2.
  - Compare with integers to avoid float bugs: `held > 0 && present * 4 >= held * 3`.
  - Exactly 75% counts as Ready.

### Academies, accounts and scout access
- **[decision]** Many academies share one app. Every user, player, session and match belongs to exactly one academy (`academyId`), and every query is scoped to the signed-in user's academy. Another academy's records answer 404, as if they did not exist.
- **[decision]** Anyone can register a new academy from the sign-in page (`/register-academy`): academy name (unique, ignoring case and spaces), town (optional), the sports it runs (at least one), and the first coach's username and password. The academy is live at once and that coach is signed in.
- An academy runs a subset of the 7 sports. Players, sessions and matches can only be created in sports the academy runs (400 otherwise). Coaches change the name, town and sports in Academy settings (`/coach/academy`). A sport that still has players cannot be removed (409).
- **[decision]** An academy can have several coaches, all with the same powers. A coach adds or removes coaches in Profiles > Coaches, but cannot remove themselves, so an academy always keeps one.
- Coaches create player accounts (with the player) and can create scout accounts for their academy.
- **[decision]** A scout belongs to one academy. A scout can sign up with an **email** and password, choosing the academy (`/register`). That account is **pending**: it cannot sign in and sees nothing until a coach of that academy approves it. Coaches of other academies never see the request.
- Scouts sign in with their email in the same box as the username (login accepts either). Usernames and emails are unique across all academies.
- A coach approves or rejects pending requests, creates scouts directly (active at once), and can remove a scout. Removed scouts and removed coaches lose access immediately, even with a valid cookie (the backend reads the account and its academy on every request).
- A wrong password always answers "Wrong username or password", so nobody can learn which emails are waiting. Only the right password on a pending account answers "waiting for the coach".

### Who sees what (enforced in the backend, not just hidden in the UI)
| Role | Can see | Can do |
|---|---|---|
| coach | everything | add players, edit any player's profile and photo, open/mark/close sessions, record matches |
| scout | **only Ready players** (with their stats and photos) | nothing else, read-only |
| player | **only their own row** | edit their own profile and photo, nothing else |

Calling an API you are not allowed to use returns 401 (not logged in) or 403 (wrong role). A scout asking for a non-Ready player, or a player asking for someone else (including trying to edit them), gets 404.

### Dates
Store and send dates as plain strings `YYYY-MM-DD` (no time, no timezone). This avoids "match is on a different day" bugs between India time and UTC on Vercel.

---

## 4. Shared contract (JSON shapes)

This section **is** the contract. The backend is plain JS, so it has no type file: it must return exactly these shapes. The frontend copies them into `frontend/src/types/index.ts`. **Changing a shape needs both teammates to agree**, and this section must be updated in the same commit.

```ts
type Role = "coach" | "player" | "scout";
type Mark = "present" | "absent";
const SPORTS = ["Football", "Cricket", "Badminton", "Volleyball", "Kabaddi", "Hockey", "Table Tennis"];   // backend: backend/src/constants.js
type Sport = (typeof SPORTS)[number];

// The academy a signed-in user belongs to
interface AcademySummary {
  id: string;
  name: string;
  town?: string;
  sports: Sport[];             // the sports this academy runs, in the standard SPORTS order
}

// GET /api/academies (public): what a scout picks from when asking for access
interface AcademyListItem {
  id: string;
  name: string;
  town?: string;
}

// GET /api/users/coaches (coach only)
interface CoachAccount {
  id: string;
  username: string;
  you: boolean;                // the signed-in coach
  createdAt: string;           // ISO date-time
}

interface SessionUser {
  id: string;
  username: string;
  role: Role;
  playerId?: string;          // only for role "player"
  academy: AcademySummary;     // returned by login, register-academy and /api/auth/me
}

// What the coach sees in GET /api/users/scouts
interface ScoutAccount {
  id: string;
  email: string;
  status: "pending" | "active";   // pending = signed up by email, waiting for the coach
  createdAt: string;              // ISO date-time
}

interface Player {
  id: string;                 // Mongo _id as a string; never send "_id" or "__v"
  name: string;
  age: number;
  sport: Sport;
  photoUrl?: string;          // https Cloudinary URL. Absent when no photo
  heightCm?: number;          // whole number, 50 to 250. Absent when not set
  weightKg?: number;          // whole number, 10 to 250. Absent when not set
  nationality?: string;       // 2 to 56 characters. Absent when not set
}

// Sent to PATCH /api/players/:id. Every field optional. null clears the value.
interface PlayerProfileUpdate {
  photoUrl?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  nationality?: string | null;
}

// Returned by GET /api/players/:id/history. Same visibility as GET /api/players/:id.
interface PlayerHistory {
  sessions: { id: string; date: string; sport: Sport; mark: Mark }[];   // closed sessions the player was marked in, oldest first
  matches: { id: string; date: string; opponent: string; stats: Record<string, number> }[]; // matches the player is on the sheet of, newest first
  peers: { matches: number; best: Record<string, number> };   // academy best in the sport: most matches by one player, highest per-match average of each stat. No names
}

// Returned by POST /api/players/:id/photo-signature (everything the browser needs to upload to Cloudinary)
interface PhotoUploadTicket {
  uploadUrl: string;          // https://api.cloudinary.com/v1_1/<cloud>/image/upload
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;           // academy-desk/players/<playerId>, so each player has exactly one photo
  overwrite: "true";
  invalidate: "true";
  allowedFormats: string;     // "jpg,jpeg,png,webp"
}

interface PlayerStats extends Player {
  sessionsHeld: number;
  sessionsPresent: number;
  attendancePct: number;      // 0–100, rounded to 1 decimal
  matchesPlayed: number;
  ready: boolean;
}

interface AttendanceEntry {
  playerId: string;
  playerName: string;
  mark: Mark | null;          // null = not marked yet
}

interface PracticeSession {
  id: string;
  date: string;               // YYYY-MM-DD
  sport: Sport;
  status: "open" | "closed";
  attendance: AttendanceEntry[];
}

interface ScoreEntry {
  playerId: string;
  playerName: string;
  stats: Record<string, number>;   // every stat key of the match's sport, from the table in §3
}

interface Match {
  id: string;
  date: string;               // YYYY-MM-DD
  sport: Sport;
  opponent: string;
  scores: ScoreEntry[];
}

interface ApiError {
  error: string;              // human-readable message, the frontend shows it as-is
  details?: unknown;          // e.g. { refused: [{ playerId, playerName, reason }] }
}
```

---

## 5. API (backend builds, frontend calls)

All under `/api`. JSON in, JSON out. Errors always use the `ApiError` shape. Auth is the cookie (`token`, httpOnly, `SameSite=Lax`, `Secure` in production, 7 days).

### Auth
| Method | Path | Who | Body | Success |
|---|---|---|---|---|
| POST | `/api/auth/login` | anyone | `{ username, password }` (`username` may be a scout's email) | 200 `{ user: SessionUser }` + sets cookie. 401 on bad login. **403** if the right password belongs to a scout still pending approval |
| POST | `/api/auth/register-academy` | anyone | `{ academyName, town?, sports: Sport[], username, password }` | 201 `{ user: SessionUser }` + sets cookie (the new coach is signed in). 400 bad name, no sports or unknown sport, bad username or short password; 409 academy name or username taken. Nothing is saved if anything fails |
| POST | `/api/auth/register-scout` | anyone | `{ email, password, academyId }` | 201 `{ ok, message }`. Creates a **pending** scout in that academy. 400 bad email, short password or no academy; 409 email already used |
| POST | `/api/auth/logout` | anyone | – | 200 `{ ok: true }`, clears cookie |
| GET | `/api/auth/me` | logged in | – | 200 `{ user: SessionUser }`, else 401 |

### Players
| Method | Path | Who | Body | Success |
|---|---|---|---|---|
| GET | `/api/players` | coach, scout, player | – | 200 `{ players: PlayerStats[] }`. **Coach: all. Scout: only ready. Player: array with only themselves.** Optional `?sport=` |
| GET | `/api/players/:id` | coach, scout, player | – | 200 `{ player: PlayerStats }`. Scout/player rules above → 404 |
| POST | `/api/players` | coach | `{ name, age, sport, username, password }` | 201 `{ player: Player }`. 409 if username taken, 400 on bad input |
| GET | `/api/players/:id/history` | coach, scout, player | – | 200 `{ history: PlayerHistory }`. Same rules as `GET /api/players/:id` (scout: Ready only, player: own only, else 404) |
| PATCH | `/api/players/:id` | coach (any), player (own only) | `PlayerProfileUpdate` | 200 `{ player: PlayerStats }`. 400 on bad input or a `photoUrl` that is not this player's Cloudinary URL. 403 scout. 404 player editing someone else |
| POST | `/api/players/:id/photo-signature` | coach (any), player (own only) | – | 200 `{ ticket: PhotoUploadTicket }`. 503 if Cloudinary is not configured. 403 scout. 404 player asking for someone else |

### Sessions
| Method | Path | Who | Body | Success |
|---|---|---|---|---|
| GET | `/api/sessions` | coach | – | 200 `{ sessions: PracticeSession[] }`, newest first. Optional `?sport=&date=` |
| POST | `/api/sessions` | coach | `{ date, sport }` | 201 `{ session }`. 409 if one already exists for that sport+date |
| GET | `/api/sessions/:id` | coach | – | 200 `{ session }` |
| PATCH | `/api/sessions/:id/attendance` | coach | `{ marks: [{ playerId, mark }] }` | 200 `{ session }`. **409 if closed**. 400 if player not on roster |
| POST | `/api/sessions/:id/close` | coach | – | 200 `{ session }`. 409 if already closed or anyone unmarked (then `details.unmarked: [{ playerId, playerName }]`) |

### Matches
| Method | Path | Who | Body | Success |
|---|---|---|---|---|
| GET | `/api/matches` | coach | – | 200 `{ matches: Match[] }`, newest first |
| GET | `/api/matches/eligible?date=&sport=` | coach | – | 200 `{ players: Player[] }`: who was present that day, to build the sheet |
| POST | `/api/matches` | coach | `{ date, sport, opponent, scores: [{ playerId, stats: { [key]: number } }] }` | 201 `{ match }`. **422** `{ error, details: { refused: [...] } }` if any player was not present that day. Nothing is saved if anyone is refused |

### Health
| GET | `/api/health` | anyone | – | 200 `{ ok: true }` (used to check the deploy) |
|---|---|---|---|---|

---

## 6. Folder layout and ownership

Each person owns one folder. Touching the other folder needs a heads-up. `AGENTS.md` is shared.

### `backend/` (Suraj): Node.js + Express, plain JS
```
backend/
  package.json            "type": "module"; scripts: dev, start, seed, seed:empty, test (`node --test`)
  vercel.json             rewrites all paths to /api so Express handles them
  .env.example
  api/index.js            Vercel entry: export default app
  src/
    app.js                builds the Express app (json, cookie-parser, cors in dev, routes, error handler)
    server.js             local only: connects DB and app.listen(PORT)
    constants.js          SPORTS, SPORT_STATS, ROLES, MARKS
    db.js                 cached Mongoose connection (serverless-safe)
    models/               User.js, Player.js, Session.js, Match.js
    middleware/auth.js    requireAuth, requireRole(...roles)
    services/stats.js     attendance + Ready calculation (one place only)
    services/matchRules.js  who may go on a match sheet (pure function, unit-tested)
    routes/               auth.js, players.js, sessions.js, matches.js
    utils/                httpError.js, validate.js, toJSON helpers (id instead of _id)
  scripts/seed.js
  test/stats.test.js      node:test, covers the 75% boundary and match rule
```

### `frontend/` (teammate): Next.js + TypeScript + Tailwind
```
frontend/
  next.config.(js|ts)     /api rewrite to BACKEND_URL (§2)
  .env.example
  src/
    types/index.ts        copy of §4
    lib/api.ts            fetch wrapper; uses mocks when NEXT_PUBLIC_USE_MOCKS=true; throws ApiError
    mocks/                mock data matching §9
    components/           Table, Badge, Form fields, RoleGuard, NavBar, ...
    app/
      layout.tsx, page.tsx   page.tsx redirects to the user's home by role
      login/page.tsx
      coach/**
      scout/page.tsx
      me/page.tsx
```

---

## 7. Backend task list (Suraj)

- [x] **B0. Setup** `backend/` (skeleton files and `package.json` scripts already exist): install `express mongoose bcryptjs jsonwebtoken cookie-parser cors dotenv`, dev `nodemon`. `app.js` + `server.js` + `/api/health`. `.env.example`.
- [x] B1. `db.js`: cached Mongoose connection.
- [x] B2. Models: `User`, `Player`, `Session`, `Match`. Unique index on `User.username` and on `Session (sport, date)`.
- [x] B3. `middleware/auth.js` + login / logout / me routes.
- [x] B4. `services/stats.js`: one function `getPlayerStats(filter)` used by every players route. Tests for the 75% boundary.
- [x] B5. Players routes, with the role filters from §3.
- [x] B6. Sessions routes: open, mark, close, lock enforcement.
- [x] B7. Matches routes: eligibility check, 422 with refused list, all-or-nothing save.
- [x] B8. Central error handler: always returns `ApiError`, never a stack trace.
- [x] B9. Seed script (§9).
- [x] B11. Player profile and photos: `heightCm`, `weightKg`, `nationality`, `photoUrl` on `Player`; `PATCH /api/players/:id`; `POST /api/players/:id/photo-signature` (signed Cloudinary upload, no SDK); Cloudinary env vars; tests including Cloudinary's documented signature example.
- [x] B12. `GET /api/players/:id/history` for the profile page (attendance trend, session list, recent matches).
- [x] B13. Seven sports with per-sport stat lines on matches (`stats`), `SPORT_STATS`, 16-player seed.
- [x] B14. Scout access: `email` and `status` on `User`, `POST /api/auth/register-scout`, login by email with the pending 403, `/api/users/scouts` routes, scouts re-checked against the database on every request. Seed adds a pending scout `new.scout@example.com` / `scout123`.
- [x] B15. Academies: `Academy` model, `academyId` on users, players, sessions and matches (session uniqueness is per academy), every route scoped to the signed-in academy, `register-academy`, `/api/academies`, `/api/academy`, coach accounts, scout sign-up per academy, account and academy re-read on every request. Seed adds Ranchi Hockey Academy; `npm run migrate:academies` links data from before academies to Dumka Sports Academy without deleting anything.
- [ ] B10. Deploy `backend/` to Vercel, set env vars, run seed against Atlas, give `BACKEND_URL` to the teammate.

## 8. Frontend task list (teammate)

Independent from day one: work with `NEXT_PUBLIC_USE_MOCKS=true` until the backend is up. Every API error message must be shown to the user (e.g. "Chandan was absent on 2026-11-01").

- [x] **F0. Setup** `frontend/` (skeleton files already exist, so don't run `create-next-app`, it refuses a non-empty folder): `npm init -y`, `npm i next react react-dom`, `npm i -D typescript @types/react @types/node tailwindcss @tailwindcss/postcss postcss`, add `dev/build/start` scripts, `tsconfig.json`, `postcss.config.mjs`. Then fill `next.config.ts` (`/api` rewrite) and `src/types/index.ts` from §4.
- [x] F1. `lib/api.ts` + `mocks/` with data matching §9.
- [x] F2. `/login`: form, after login go to the user's home by role.
- [x] F3. Shared layout: top bar with username, role, logout. Mobile-friendly (coach uses a phone on the field).
- [x] F4. **Route guarding**: a `RoleGuard` (or server layout) calls `/api/auth/me`. Not logged in → `/login`. Wrong role → own home (`coach → /coach`, `scout → /scout`, `player → /me`). This is only for UX; the backend does the real blocking.
- [x] F5. **Coach**
  - `/coach`: Ready board: table of all players with attendance %, matches, Ready badge. Filter by sport.
  - `/coach/players`: list only (cards or table). `/coach/profiles` ("Profiles", last in the sidebar): starts by asking whose profiles, **Players** or **Scouts**, and shows only that group's options. Players: a name filter, a closed "Add player" form (name, age, sport, username, password) and an "Edit profile" list that opens `/coach/players/[id]?edit=1`. Scouts: a closed "Create a scout" form, pending requests with Approve or Reject, and active scouts with Remove access.
  - `/coach/sessions`: list of sessions (open/closed badge) + "Open session" form (date, sport).
  - `/coach/sessions/[id]`: roster with Present / Absent toggle per player, "Close session" button. When closed: read-only with a locked badge.
  - `/coach/matches`: list of matches.
  - `/coach/matches/new`: date + sport + opponent, then load eligible players and enter a score for each who played. Show refused-player errors from the 422.
- [x] F6. **Scout** `/scout`: list of Ready players only (name, age, sport, attendance %, matches). Read-only.
- [x] F7. **Player** `/me`: their own row only: attendance %, sessions present/held, matches played, Ready or not (and what's missing, e.g. "needs 1 more match").
- [x] F8. Empty states and loading states on every list.
- [x] F10. Reference theme (navy football club look) and photos: photo avatars on every list, a swipeable squad carousel of photo cards, the profile showcase with the real photo, height, weight and nationality, and an edit panel with photo upload (player: own, coach: any). Mock mode stores the photo in the browser.
- [x] F11. Profile page in the reference layout (navy kept): header with photo and body details, season tiles, attendance trend chart, trial status, recent matches, session history. Real data only. Profiles are pages: `/coach/players/[id]`, `/scout/players/[id]`, `/me`. Left sidebar navigation and player search (coach: everyone, scout: Ready players).
- [x] F12. Seven sports. Per-sport stat fields on the match form (blank = 0), the stats on matches list and profile ("{Sport} stats" totals and per-match average), 16-player mock data matching §9.
- [x] F13. "Match by match" charts on every profile: one small bar chart per stat of the sport, one bar per match (last 8), own scale from 0, value labels, hover and keyboard tooltip. The Recent matches list is the table view.
- [x] F14. Profile restyled after a game-stats screen: Rating + headline strip, radar ("Performance"), Attendance and per-sport detail lists. Radar axes are Attendance, Matches and each sport stat (0 to 100 against the academy best); Rating is their plain average. Real data only, no letter grade. Backend: `history.peers` (anonymous academy maxima, `services/peers.js`).
- [x] F15. Theme: the Onthi DESIGN.md palette after an unslop pass. Light #F7F7FD canvas with white cards (#E2E8F0 hairline, 16px cards, 12px controls, 6px tags, no shadows or gradients), indigo #6366F1 as the single accent (every action button, bars, present marks, selection; #4F46E5 for text and lines on white), lime #58CC02 only for Ready tags, orange #C2410C with a peach fill for alerts, absent marks and the 75% line, link purple #6D28D9, lilac #EDE9FE hover. Be Vietnam Pro at weight 600 for headings, titles and buttons, tabular figures. Signature detail: a small sport-coloured dot beside the sport name (`SportTag` in `components/ui.tsx`: Football lime, Cricket sky, Badminton purple, Volleyball peach, Kabaddi indigo, Hockey yellow, Table Tennis lilac). About 30% dark using the Onthi dark theme: sidebar #0C0C13, banner, stats strip and KPI tiles #1B1B21, indigo #7678F3 numbers; the current nav item is a surface step, not a solid block. Stat text is singular or plural (`statText` in `lib/sportStats.ts`: "1 goal", "2 goals"). Tokens in `app/globals.css`. Components use semantic names (`text-ink`, `bg-dark`, `text-on-dark`, `bg-primary`, `text-accent-ink`, `bg-go`), so do not write hex or Tailwind palette classes.
- [x] F16. Sport bar (`SportBar` in `components/SportFilter.tsx`, remembered in the browser): a row of buttons, All sports plus each sport the academy runs (with its colour dot), shown above the lists it filters: Ready board, Players, Sessions, Matches, Profiles and the scout page. It replaces the old dropdown in the top bar, is a keyboard radio group, and is hidden on single records, settings and for players. The add-player, open-session and record-match forms start on the chosen sport. Player search still searches everyone.
- [x] F18. Scout access. Public `/register` (email, password, confirm; says the coach must approve). Login box is "Username or email" with a link to `/register`. Coach: Profiles is now the last sidebar item and holds a "Scout access" section (create a scout, approve or reject pending requests, remove an active scout with a confirm step) above the add-player form. Mocks follow the same rules (demo storage key `academy-mock-db-v3`).
- [x] F19. Ready board: 3 KPI tiles, then the players. The attendance-by-session-day chart and the Needs attention panel were removed. Wherever there is a Table / Photo cards choice (`PlayersView`: Ready board, Players, scout page) the table is the default.
- [x] F22. Sign-in screen in two halves: a dark Academy Desk panel (headline, one line on what it does, three features) on the left, the card on the right with **Sign in** and **Sign up** tabs on top (`components/AuthShell.tsx`, `components/AuthTabs.tsx`). `/login` opens Sign in, `/register-academy` opens Sign up, and switching tabs changes the address. Password fields have a show/hide button. The scout sign-up page (`/register`) uses the same frame. On phones the panel shrinks to the product name above the card. No remember-me or forgot-password, since the app has no password recovery.
- [x] F23. "Try it in one click" on the Sign in tab, in every mode including the deployment: Coach (`coach / coach123`), Player (`dev / dev123`, Cricket) and Scout (`scout / scout123`) of Dumka Sports Academy. These accounts are public, so remove the section (QUICK_ACCOUNTS in `components/AuthTabs.tsx`) before real use.
- [x] F21. Academies: `/register-academy` (name, town, sports, coach login), "Register your academy" on the sign-in page, academy picker on scout sign-up, the academy's name in the sidebar, Academy settings for coaches (`/coach/academy`), a Coaches choice in Profiles (`components/CoachManager.tsx`), and every sport menu shows only the academy's sports. Mocks follow the same rules (demo storage key `academy-mock-db-v5`).
- [x] F20. Profile management made compact: a Players / Scouts choice first (Scouts shows how many requests are waiting), then only that group's options (`components/PlayerManager.tsx`, `components/ScoutAccess.tsx`). Both "add" forms stay closed until their button is pressed, and the player list has a name filter.
- [x] F17. Coach sidebar: new "Profiles" section (`/coach/profiles`) for profile management. Creating players moved out of Players, which is now a view. Edit links open the profile with the editor already open.
- [ ] F9. Deploy `frontend/` to Vercel with `BACKEND_URL` set. This is the live URL we submit.

---

## 9. Seed data and the checks

`npm run seed` (in `backend/`) wipes the database and loads this. `npm run seed:empty` loads only the coach and scout accounts, so we can do the checks live from scratch.

Academies: **Dumka Sports Academy** (Dumka, all 7 sports) holds everything below. **Ranchi Hockey Academy** (Ranchi, Football and Hockey) has coach `ranchi / ranchi123` and players `sahil / sahil123` and `tanvi / tanvi123`, and nothing else, to show that academies are kept apart.

Dumka accounts: `coach / coach123`, `scout / scout123`, a pending scout `new.scout@example.com / scout123` (full seed only, for showing the approval flow), and one login per player: lowercase first name, password name + `123` (for example `dev / dev123`).

16 players in 7 sports, each with 4 closed sessions and 2 matches with real stat lines: Football (Aarav, Bina, Chandan), Cricket (Dev, Esha, Farhan), Badminton (Gita, Harsh), Volleyball (Indu, Jay), Kabaddi (Kiran, Lakshmi), Hockey (Manoj, Nisha), Table Tennis (Omkar, Pooja). Not Ready: Chandan, Farhan, Harsh, Lakshmi. The Football table below is the one the four checks use.

Football. Sessions (all closed): 2026-10-25, 2026-10-27, 2026-10-29, 2026-11-01. Matches: 2026-10-29 and 2026-11-01.

| Player | 10-25 | 10-27 | 10-29 | 11-01 | Attendance | Matches | Ready |
|---|---|---|---|---|---|---|---|
| Aarav | P | P | P | P | 4/4 = 100% | 2 | ✅ |
| Bina | A | P | P | P | 3/4 = **75%** | 2 | ✅ (boundary) |
| Chandan | P | P | A | A | 2/4 = 50% | 0 | ❌ |

How each check is shown:
1. Session 2026-11-01: Aarav and Bina present, Chandan absent. Chandan's row shows him absent.
2. Match 2026-11-01 scores Aarav and Bina. Adding Chandan returns 422 "absent that day".
3. Chandan (50%) not Ready. Bina at exactly 75% with 2 matches is Ready.
4. Log in as `scout`: sees Aarav and Bina only. Log in as `chandan`: sees only his own row. Calling `/api/players` directly gives the same filtered result.

---

## 10. How we work together

- Branches: `be/<thing>` and `fe/<thing>`, merge into `main` often (small merges, fewer conflicts). Pull `main` before starting each task.
- Backend changes stay in `backend/`, frontend changes stay in `frontend/`. Then merges almost never conflict.
- Vercel deploys both apps from `main`, so `main` must always work (`npm run build` in `frontend/`, `npm test` in `backend/` before merging).
- Tick the checkboxes in §7 / §8 as tasks finish so the other person can see progress.
- If the frontend needs something the API doesn't give, write it under **Open questions** below rather than working around it.
- Competition rules: write our own prompts, don't paste or screenshot the challenge page into an AI, don't use other teams' code. No push after End.

## 11. Frontend notes

- Run it: `cd frontend && npm run dev`. `frontend/.env.local` has `NEXT_PUBLIC_USE_MOCKS=true` (demo data in the browser, no backend). Set it to `false` and set `BACKEND_URL` to use the real API. `NEXT_PUBLIC_*` values are fixed at build time, so restart or rebuild after changing it.
- Mock data is stored in `localStorage`. To reset the demo, run `localStorage.clear()` in the browser console.
- Visual rules come from the `landing-page-design` skill (Part B): Geist only, named text styles in `globals.css` (`heading-5`, `body-6`, `button-md`, ...), spacing from the 0/2/4/8/12/16/24/32/40/48/64/80/96 table, dark surfaces from the approved set, Phosphor icons, no hyphens in copy.
- Theme: the navy blue football club look from the reference design wins over the generic dark colours in the skill (the user asked for it). The skill's type, spacing, motion and state rules still apply.
- Deslop pass (`deslop-ui` skill): flat navy surfaces, one solid blue accent, colour only for real states (green present, red absent, amber ready). No gradients, glows, blurred blobs, dot grids, pulsing dots, all caps labels or glass cards. Blur is kept only on the floating nav bar. Radius scale: `rounded-lg` controls, `rounded-xl` panels, `rounded-md` tags, circles only for round things. Every number on a profile must come from the API: no invented jersey numbers, honours or decorative charts. Copy is sentence case, plain words, no exclamation marks.
- Photos: the browser shrinks the picture first (longest side 1200px, JPEG), then uploads it. With mocks on, the picture is kept in the browser instead of Cloudinary. Cards use `object-fit: cover` and show a silhouette when a player has no photo.
- On the real backend the match form lists everyone of the sport, and disables players who were not present that day (the server still refuses them with 422 if one gets through).

## 12. Open questions

- (none yet)
