# RIFFORA

> Find Your Frequency.

RIFFORA is a MERN music-discovery application that brings search, playback, personal libraries, playlists, listening history, lyrics, and eligible offline audio into one web experience.

## Project overview

The project combines a React/Vite client with an Express/MongoDB API. YouTube content is discovered and played through the official YouTube interfaces, while the separate direct-audio path is used for tracks that the provider marks as downloadable. The application does not download or extract audio from YouTube videos.

## Problem statement

Listeners often move between separate tools to discover music, keep a queue, save favourites, organise playlists, and revisit recently played tracks. RIFFORA centralises those related tasks in a personal music space while keeping YouTube embed playback distinct from downloadable direct audio.

## Target users

RIFFORA is intended for listeners who want a lightweight web app for discovering music, maintaining a personal library, and organising playback through playlists and queues.

## Solution

The client presents music-discovery and library workflows through one persistent application shell. The API manages authentication and user-owned data in MongoDB, accesses configured music/lyrics providers, and exposes the endpoints consumed by the client. Playback state is retained in the browser so the application can restore a selected track and related state after normal navigation or a refresh, subject to browser media policies.

## Key features

- Music discovery through the YouTube integration, with a curated demo catalog when a YouTube Data API key is not configured.
- Persistent playback controls, a queue, shuffle/loop/autoplay controls, and browser-side playback-session restoration.
- Account registration and sign-in, liked songs, playlists, and recently played history.
- Lyrics supplied by LRCLIB when available, including timed lyric data when the provider returns it.
- A direct-audio catalog backed by Free To Use API data; only eligible direct-audio tracks and user-imported audio are handled by the offline-download flow.
- Browser-local offline audio storage using IndexedDB.
- Responsive client views for search, library, playlists, history, downloads, settings, and authentication.

## Technology stack

| Area | Technologies in this repository |
| --- | --- |
| Client | React, Vite, React Router, Axios, Lucide React, React Hot Toast |
| Server | Node.js, Express, Mongoose, MongoDB, JWT, bcryptjs, cookie-parser, CORS |
| Playback and storage | YouTube IFrame Player API, browser `Audio`, `localStorage`, IndexedDB |
| External services | YouTube Data API v3, LRCLIB, Free To Use API |

## Project architecture

```text
React + Vite client
  ├─ routes, pages, reusable music/layout components
  ├─ AuthContext for the cookie-backed user session
  ├─ PlayerContext and PersistentPlayer for playback state/control
  ├─ localStorage for playback-session metadata
  └─ IndexedDB for downloaded direct-audio blobs
                    │ /api (Vite proxy in development)
                    ▼
Express API
  ├─ authentication, users, playlists, and listening history
  ├─ YouTube discovery and browser embed playback support
  ├─ LRCLIB lyrics lookup
  └─ direct-audio catalog integration
                    │
                    ▼
MongoDB for user, playlist, and listening-history data
```

## Project folder structure

```text
vibetube/
├─ client/
│  ├─ public/                 # Static client assets
│  ├─ src/
│  │  ├─ api/                 # Client API helpers
│  │  ├─ components/          # Layout and music UI components
│  │  ├─ context/             # Authentication and player state
│  │  ├─ pages/               # Route-level screens
│  │  ├─ routes/              # Route protection
│  │  └─ utils/               # Artwork, downloads, playback, formatting
│  ├─ package.json
│  └─ vite.config.js
├─ server/
│  ├─ config/                 # MongoDB connection
│  ├─ controllers/            # Request handlers
│  ├─ middleware/             # Authentication and error handling
│  ├─ models/                 # Mongoose models
│  ├─ routes/                 # API route definitions
│  ├─ services/               # YouTube, lyrics, and direct-audio services
│  ├─ test/                   # Node regression tests
│  ├─ index.js                # Express entry point
│  └─ package.json
└─ README.md
```

## Prerequisites

- Node.js and npm.
- A reachable MongoDB instance.
- A YouTube Data API v3 key for live YouTube search. Without one, the server starts in its documented demo mode and live YouTube search is unavailable.
- Network access to the external providers when using their live functionality.

## Installation

Run the following from the `vibetube` directory. The repository has separate client and server packages; there is no runnable root package script.

```powershell
cd server
npm install

cd ..\client
npm install
```

Create `server/.env` before starting the backend. There is no committed environment template in this repository, so create the file manually using the variable names in the next section. Do not commit the file or any real credentials.

## Environment variables

Set these variables in `server/.env`. Values below are deliberately not included.

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | Express listening port. Defaults to `5000`. |
| `MONGO_URI` | Yes | MongoDB connection string. The server exits if it cannot connect. |
| `JWT_SECRET` | Yes for authentication | Secret used to sign and verify session tokens. |
| `CLIENT_URL` | No for local development | Allowed browser origin for credentialed CORS requests. Defaults to `http://localhost:5173`. |
| `YOUTUBE_API_KEY` | Yes for live YouTube search | YouTube Data API v3 credential used by the discovery service. |
| `NODE_ENV` | No | Set to `production` on a secure deployment so authentication cookies use production security settings. |

`VIBETUBE_TEST_URL` is optional and is only used by the server regression tests to target an API URL other than `http://localhost:5000`.

## Running the frontend

In one terminal, from `vibetube/client`:

```powershell
npm run dev
```

Vite serves the client on `http://localhost:5173` and proxies `/api` requests to `http://localhost:5000` during development.

## Running the backend

In a second terminal, from `vibetube/server`:

```powershell
npm run dev
```

Use `npm start` to run the same server without Nodemon. By default, the API listens on `http://localhost:5000`; `GET /api/health` is the available health endpoint.

## Database configuration

RIFFORA uses MongoDB through Mongoose. Set `MONGO_URI` in `server/.env` to a MongoDB deployment the server can reach. The backend connects at startup and stops if the connection fails, so start MongoDB (or make the configured hosted deployment reachable) before starting the server.

User accounts, playlists, and listening history are persisted in MongoDB. Offline audio is different: it is stored in the browser's IndexedDB and is not uploaded to MongoDB.

## API and external service configuration

The Express server mounts API groups for authentication, users, playlists, history, YouTube, and music under `/api`.

- **YouTube Data API v3:** configure `YOUTUBE_API_KEY` for live discovery metadata and search. Browser playback uses the YouTube IFrame Player API and remains subject to YouTube's embedding rules.
- **LRCLIB:** provides lyrics lookup through `https://lrclib.net/api`. No LRCLIB API key is referenced by the current code.
- **Free To Use API:** provides the direct-audio catalog through `https://api.freetouse.com/v3`. No additional environment variable is referenced by the current code.

External providers can change their availability, content, embed permissions, rate limits, CORS behaviour, or licensing terms independently of this project. Do not treat a provider response as a guaranteed permanent capability.

## Core application workflows

1. **Discovery and playback:** a listener browses or searches music, selects a track, and controls playback from the persistent player. YouTube results use embedded playback; direct-audio and locally imported audio use the browser audio path.
2. **Personal library:** an authenticated user can maintain liked songs, playlists, and listening history. The API protects user-owned data with the session established at sign-in.
3. **Queue and session restoration:** the player keeps queue and control state in the client. Playback metadata is stored locally so the app can restore a selection and position after a refresh; whether audio automatically resumes depends on browser policy.
4. **Lyrics:** the client requests lyrics for the active track and displays provider data when a match is available. A missing provider match is an expected empty state.
5. **Offline audio:** only eligible direct-audio tracks and user-imported audio enter the browser-local download flow. Downloaded blobs are stored in IndexedDB and can be played through the native audio path. YouTube tracks are not downloaded.

## Testing instructions

No tests were run as part of this documentation-only update.

The backend regression suite expects a running backend with access to its configured MongoDB instance. It creates its own test accounts and playlist/history records, so use a disposable development database when practical.

```powershell
cd server
npm run test:regression
```

To point that suite at another running API, set `VIBETUBE_TEST_URL` before the command.

The client includes focused Node playback utility tests that can be run from `client`:

```powershell
node --test .\src\utils\playbackSource.test.mjs .\src\utils\playbackSession.test.mjs
```

## Production build

Build the frontend from `vibetube/client`:

```powershell
npm run build
```

Vite writes the production client bundle to `client/dist`. You can inspect the built client locally with:

```powershell
npm run preview
```

The backend does not define a separate build step; deploy it with its production dependencies, `npm start`, a reachable MongoDB deployment, and the required server environment variables.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Backend exits during startup | Confirm `MONGO_URI` is set and MongoDB is reachable. |
| Client API requests fail locally | Start the backend on port `5000`, or update the local development setup consistently with the Vite proxy and `CLIENT_URL`. |
| Live YouTube search is unavailable | Configure a valid `YOUTUBE_API_KEY`; quota, rate-limit, network, or provider errors can also prevent results. |
| Sign-in/session problems across origins | Confirm `CLIENT_URL` exactly matches the client origin and use HTTPS in production so secure cookies can be sent. |
| A video cannot play in the embedded player | Some YouTube videos cannot be embedded, and browsers can block automatic media playback. Try a different track or start playback through a user action. |
| Lyrics or direct-audio results are missing | The external provider may have no matching item or may be unavailable/rate-limited. |

## Security considerations

- Keep `server/.env` private and never commit real database URLs, API keys, or `JWT_SECRET` values.
- Authentication uses an HTTP-only cookie. Use HTTPS and set `NODE_ENV=production` for deployed environments.
- Configure `CLIENT_URL` to the exact production client origin; credentialed CORS should not be broadly opened.
- Treat external provider data as untrusted and respect each provider's terms and licensing conditions.
- Do not add a YouTube download path: this application intentionally keeps YouTube embed playback separate from eligible direct-audio downloads.

## Deployment instructions and status

No public deployment URL or repository deployment configuration is currently present.

Before deploying:

1. Build and host the `client/dist` bundle.
2. Host the Express service and set `PORT`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `NODE_ENV=production`, and, when live discovery is needed, `YOUTUBE_API_KEY`.
3. Use HTTPS for both client and API so secure authentication cookies work correctly.
4. Allow the API service to reach MongoDB and required external providers.
5. Verify authentication, CORS, provider behaviour, and playback in the deployed browser environment.

## Known limitations

- No production deployment is configured or documented in this repository.
- YouTube embedding and autoplay remain subject to browser and provider restrictions; not every video can play in an embedded player.
- Live discovery, lyrics, and direct-audio availability depend on third-party providers and network conditions.
- Browser-local offline audio is scoped to the browser profile/device where it was downloaded; it is not synchronised through MongoDB.
- Only provider-eligible direct audio and locally imported audio participate in offline downloads. YouTube tracks are embed-only.
- The repository has separate client and server package manifests rather than a unified root script.
