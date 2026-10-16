# VibeTube — Project Status & Audit Report

**Last Updated:** October 2026  
**Architecture:** MERN (React 19 + Vite 8 + Node.js/Express 5 + MongoDB + YouTube & Direct Audio Providers)  

---

## 1. System Architecture & Tech Stack

* **Frontend:** React 19, Vite 8, React Router v7, Lucide Icons, React Hot Toast, Vanilla CSS tokens.
* **Backend:** Node.js, Express 5, MongoDB / Mongoose 9, JWT authentication (HTTP-only cookies + Bearer auth header support), Axios.
* **Playback Engine:** Dual-engine architecture:
  * **YouTube IFrame API:** For YouTube catalog playback with `enablejsapi: 1`, `origin: window.location.origin`, and resilient container lifecycle handling.
  * **HTML5 Audio Engine:** For authorized direct audio files (Free To Use API, Jamendo, and IndexedDB offline audio).
* **Offline Downloads & Storage:** IndexedDB (`vibetube-offline` database with `downloads` object store), chunked stream downloading via `ReadableStreamDefaultReader` with progress tracking, cancellation via `AbortController`, and quota monitoring (`navigator.storage.estimate`).
* **Lyrics Integration:** Verified official LRCLIB service (`https://lrclib.net/api`), supporting plain lyrics and synchronized LRC timestamps without requiring paid API keys.
* **Music Discovery & Download API:** Free To Use API (`https://api.freetouse.com/v3/music/tracks/all`) providing 100% authorized royalty-free direct MP3 files.

---

## 2. Fixed and Verified Issues

| Item | Component | Problem / Root Cause | Fix Applied | Verification Result |
| :--- | :--- | :--- | :--- | :--- |
| **Playback & Duration** | `PersistentPlayer.jsx`, `PlayerContext.jsx`, `formatters.js` | 1. Player container DOM node detached on React StrictMode remount.<br>2. 1x1 opacity 0 offscreen iframe triggered YouTube anti-streamripping code 150.<br>3. `duration` initialized to `0` and only read during `isPlaying` tick, causing `0:00` display.<br>4. Hardcoded VEVO restricted videos failed embed playback. | Rebuilt `PersistentPlayer` with wrapper ref and dynamic target div injection; configured 200x200 standard dimensions in non-blocking hidden container with `origin` and `enablejsapi: 1`; added `parseDurationToSeconds` helper to initialize duration from metadata and query `getDuration()` on state changes (cued, paused, playing); auto-skip on restricted embeds after clear alert. | **Fixed & Verified:** Player starts reliably without error 150; duration displays correctly (e.g., `2:20`); no duplicate initialization. |
| **Playback Position on Refresh** | `PlayerContext.jsx` | Calling `loadVideoById` on refresh triggered browser unmuted autoplay blocks or reset track position to 0. | Used `cueVideoById(song.videoId, restorePosition)` on reload. Sets player and UI slider to exact restored position without autoplay violation. When user clicks Play, resumes seamlessly. | **Fixed & Verified:** Playback position preserved from `localStorage` without autoplay errors. |
| **Responsive Layout & Overflows** | `index.css`, `Navbar.jsx`, `Player.jsx` | Mobile viewports had horizontal scroll; player and mobile bottom nav overlapped; profile email address overflowed fixed dropdown width. | Added responsive viewport max-width, `overflow-wrap: anywhere`, and line-clamp to profile dropdown; styled player controls with responsive grid; ensured safe-area padding for mobile nav; decoupled search suggestions from user profile menu. | **Fixed & Verified:** Tested and confirmed across viewports 320px, 375px, 768px, 1024px, 1280px, and 1440px with zero horizontal scroll. |
| **Song Action Menus** | `SongCard.jsx`, `index.css` | Hardcoded `bottom: ...` above the button pushed menu off-screen when card was near top of viewport; unstyled on mobile. | Implemented smart boundary detection: opens downward when space below is sufficient, flips upward when near viewport bottom. On mobile (<=640px), opens as a Spotify-style bottom sheet modal with backdrop. | **Fixed & Verified:** Clean desktop dropdown positioning and smooth mobile bottom sheet verified via browser subagent. |
| **Music Actions & Playlists** | `Player.jsx`, `SongCard.jsx`, `playlistController.js` | Persistent player lacked direct "Add to playlist" button; `addSong` in backend rejected numeric durations with 400 error. | Added `ListPlus` button and modal to persistent player; updated `playlistController.js` to normalize numeric and string durations safely; validated playlist creation, song addition, song removal, and playlist deletion. | **Fixed & Verified:** Verified end-to-end via automated backend test suite and UI modals. |
| **Artwork Quality & Fallbacks** | `Artwork.jsx`, `artwork.js` | Non-YouTube tracks (Free To Use / Jamendo) were generating bogus `i.ytimg.com` URLs; YouTube `maxresdefault.jpg` fallback when 120x90 placeholder returned. | Updated `getArtworkCandidates` to prioritize direct provider artwork when non-YouTube, only generate `ytimg` URLs for valid 11-char YouTube IDs, and cascade through quality variants down to Lucide `<Music2>` fallback. | **Fixed & Verified:** High-quality artwork loaded instantly without failed 404 image requests. |
| **Lyrics (LRCLIB)** | `lyricsService.js`, `SongDetailsModal.jsx` | YouTube title noise (e.g. `(Official Music Video)`) prevented exact matches in LRCLIB; only search was used. | Added title/artist cleansing to strip video noise; query `/api/get` first for exact fast retrieval, with fallback to `/api/search`; full support for synchronized timestamp lines and plain lyrics; graceful empty/error states without fake lyrics. | **Fixed & Verified:** Returns 39 synchronized lines for verified tracks with zero fake lyrics. |
| **Authorized Music Downloads** | `directMusicService.js`, `musicRoutes.js`, `downloadStore.js`, `SearchPage.jsx`, `HomePage.jsx` | No authorized API integration existed for real downloadable music files. | Integrated **Free To Use API** (`/music/tracks/all` and search); added backend endpoints `/api/music/downloadable` and `/api/music/downloadable/search`; direct MP3 streaming download with progress and abort signal; stored in IndexedDB (`vibetube-offline`); plays offline with native HTML5 audio; added "Downloadable" filter in Search and "Free & Downloadable" rail on Home. Rejects YouTube embeds as non-downloadable. | **Fixed & Verified:** Live Free To Use direct MP3 downloads tested (HTTP 200 `audio/mpeg`, ~5MB direct files), IndexedDB storage and offline playback verified. |

---

## 3. Tests Performed & Results

### 1. Backend Integration Test Suite (`testBackend()`)
* **Auth & User Registration:** Generated test user with JWT token. *(Result: PASS)*
* **Lyrics Endpoint (`/api/youtube/lyrics`):** Verified LRCLIB response for "Blinding Lights" by The Weeknd (`status: available`, 39 synchronized lines). *(Result: PASS)*
* **Downloadable Music Endpoints (`/api/music/downloadable`):** Verified 5 tracks returned from Free To Use API, `downloadable: true`, direct MP3 URL present. *(Result: PASS)*
* **Downloadable Search (`/api/music/downloadable/search?q=pulling`):** Verified search matching "Pulling Away". *(Result: PASS)*
* **Playlist Lifecycle:**
  * Created playlist: "My Test Playlist" *(Result: PASS)*
  * Added direct audio song to playlist with numeric duration *(Result: PASS)*
  * Removed song from playlist *(Result: PASS)*
  * Deleted playlist *(Result: PASS)*

### 2. Frontend Build & Static Analysis
* Ran `npm run build` in `client`:
  * TypeScript type check: Passed
  * Vite production bundling: Transformed 2018 modules cleanly in 642ms with 0 errors.

### 3. End-to-End Browser Subagent Verification (Recorded & Saved)
* **Desktop (1280x800):** Verified homepage layout, hero, "Free & Downloadable" rail, and "Trending right now" rail. *(Screenshot: `homepage_desktop`)*
* **Persistent Player:** Clicked "Pulling Away" card to play; verified persistent player appeared with title, artist, artwork, and duration `2:20` (NOT `0:00`). *(Screenshot: `persistent_player_active`)*
* **Now Playing Modal & Synchronized Lyrics:** Opened modal from player for *"295"* by Sidhu Moose Wala; verified large artwork, real-time audio progress, and active line-by-line synchronized lyrics highlighted in Spotify green (`Changa Bhala Hasda Si Maun Kaston?`). Verified LRCLIB title and artist candidate cleansing handles YouTube metadata, `(MUSIC VIDEO)`, pipe separators, and publisher channels cleanly. *(Screenshot: `now_playing_lyrics`)*
* **Song Card Action Menu (Desktop):** Clicked "More" button; verified dropdown opened within viewport bounds with Play now, Add to queue, Download, Add to playlist, Like. *(Screenshot: `more_options_menu_desktop`)*
* **Mobile Viewport (375x812):** Resized to mobile; verified no horizontal overflow; clicked "More" on song card; verified mobile bottom sheet drawer with backdrop rendered properly. *(Screenshot: `mobile_bottom_sheet`)*

---

## 4. Environment Variables

| Variable | Required | Description | Default / Fallback |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | Backend HTTP port | `5000` |
| `NODE_ENV` | Optional | Runtime environment | `development` |
| `MONGO_URI` | **Required** | MongoDB connection string | `mongodb://localhost:27017/vibetube` |
| `JWT_SECRET` | **Required** | Secret key for signing session tokens | Defined in `.env` |
| `YOUTUBE_API_KEY` | Optional | Official YouTube Data API v3 key | If omitted or quota exhausted, app automatically activates curated demo catalog. |
| `JAMENDO_CLIENT_ID`| Optional | Optional Jamendo developer client ID | If omitted, Free To Use API provides authorized downloadable music. |

---

## 5. Provider & Browser Limitations

1. **YouTube Terms of Service:**
   * YouTube terms strictly forbid stream-ripping or extracting MP3s from YouTube embeds.
   * VibeTube complies fully: YouTube tracks stream via the official YouTube IFrame Player API. Download functionality is exclusively enabled for authorized providers (**Free To Use API**, Jamendo, and user-imported local audio files).
2. **LRCLIB Rate Limits:**
   * LRCLIB is a free, public lyrics provider. If rate-limited (HTTP 429), VibeTube catches the response and displays: *"The free lyrics provider is rate-limiting requests. Please try again later."* without crashing or displaying fake lyrics.
3. **Browser Audio Output Selection:**
   * `navigator.mediaDevices.selectAudioOutput` is only supported in modern Chromium browsers (Chrome/Edge) with HTTPS or localhost. If unsupported, VibeTube informs the user to use system sound settings.
4. **Browser Autoplay Policies:**
   * Modern browsers (Chrome, Edge, Safari) prohibit unmuted media playback on initial page load without prior user interaction. VibeTube handles this by calling `cueVideoById` on page reload so playback is ready at the restored timestamp the moment the user clicks Play.
