# Eisenhower Matrix PWA: Project Plan

## Goal
Build a personal Eisenhower Matrix task app that runs on an iPhone like a real app, at **zero cost**, using vibe coding in VS Code.

## Constraints
- **Budget: $0.** No paid Apple Developer account ($99/yr), so no App Store, TestFlight, or native iOS builds.
- **Device: iPhone** (no Android phone, no Mac confirmed).
- **Tools: VS Code** plus an AI coding assistant (Claude Code extension or terminal).
- **Background:** CS degree, so comfortable reading and debugging code.

## The Eisenhower Matrix
| Quadrant | Urgent | Important | Action |
|---|---|---|---|
| 1. Do First | Yes | Yes | Do it now |
| 2. Schedule | No | Yes | Plan a time |
| 3. Delegate | Yes | No | Hand it off |
| 4. Eliminate | No | No | Drop it |

## Chosen Approach: Free PWA
A Progressive Web App (PWA) is a website that can be added to the iPhone Home Screen and launches full-screen like an app.

**Why this route:**
- Free to build, host, and install.
- No Mac or App Store needed.
- Works on the PC too (Edge/Chrome "Install app" gives a Windows desktop window).

**Why not the alternatives:**
- *Expo + Expo Go:* only runs while the PC dev server is on, so it can't be used day to day.
- *Expo native build on iPhone:* requires the paid Apple account.
- *Android APK:* free, but no Android phone.

## Tech Stack
- **Vite + React + TypeScript** (changed from Expo, since it's simpler for a PWA)
- **vite-plugin-pwa** for the manifest and service worker (offline support)
- **dnd-kit** for drag and drop (plus a tap-to-move menu as a touch fallback)
- **Browser storage (localStorage or IndexedDB)** for saving tasks
- **Vercel** for free hosting with automatic HTTPS
- **Reminders backend (later):** Cloudflare Workers with cron triggers, or Supabase edge functions and scheduled jobs. Avoid Firebase, since its scheduled functions need a billing account. Verify current free-tier limits before committing.

## About HTTPS
iOS only allows PWA install and push features on HTTPS sites. Vercel, Netlify, and Cloudflare Pages provide HTTPS automatically and for free, so nothing needs to be configured. Local development (`http://localhost`) is fine on the computer, but testing install and push on the phone requires the deployed HTTPS link, so **deploy early**.

## Phases

### Phase 1: Setup
- [ ] Install Node.js 20+ and VS Code
- [ ] Set up Claude Code (extension or terminal)
- [ ] Create free GitHub and Vercel accounts
- [ ] Run `npm create vite@latest eisenhower -- --template react-ts`
- [ ] Check iPhone iOS version (Settings → General → About). **Needs 16.4 or newer.**

### Phase 2: Build the app (test each slice in the browser)
- [ ] 1. 2x2 grid with hardcoded sample tasks, color-coded, mobile-first layout
- [ ] 2. Add, edit, complete, and delete tasks
- [ ] 3. Persist tasks in browser storage
- [ ] 4. Move tasks between quadrants (drag and drop plus tap-to-move menu)
- [ ] 5. Export/import data as a file for backup
- [ ] 6. In-app "Due today / What should I do now?" view

### Phase 3: Make it installable and deploy
- [ ] Add web app manifest (name, icons, `display: standalone`, theme color)
- [ ] Add service worker via `vite-plugin-pwa` for offline use
- [ ] Push code to GitHub and connect the repo to Vercel
- [ ] On iPhone: open the Vercel link in **Safari** → Share → **Add to Home Screen**
- [ ] Confirm it launches full-screen and works offline

### Phase 4: Reminders (optional, hardest part)
iOS web push is sent from a server, not scheduled by the app itself.

- [ ] Generate VAPID keys for Web Push
- [ ] Add a "Enable notifications" button (the permission prompt must be triggered by a user tap)
- [ ] App sends push subscription, task title, and reminder time to the backend
- [ ] Scheduled job runs about every minute and sends due notifications
- [ ] Handle expired or dropped subscriptions gracefully

### Phase 5: Windows bonus
- [ ] Open the deployed site in Edge or Chrome and use "Install app" for a desktop window

## Known Limitations and Risks
- Requires iOS 16.4+.
- Push works **only** when the PWA is installed to the Home Screen, not from a Safari tab.
- Push subscriptions occasionally drop on iOS, so reminders are good but not bulletproof.
- Background capabilities are more limited than a native app.
- **Mitigation:** the in-app "Due today" view means the app never depends only on notifications.
- Apple controls PWA behavior on iOS, so features may change between versions.

## Future Ideas (after the core works)
- Recurring tasks
- Tags or projects
- Daily "top 3 priorities" view
- Dark mode
- Sync across devices (e.g. via Supabase)
- Revisit native iOS later if money becomes available (Expo + EAS + $99 Apple account)

## First Prompt for Claude Code (Phase 2, slice 1)
> Build the main screen of an Eisenhower Matrix app in this Vite + React + TypeScript project. Create a 2x2 grid with four quadrants: "Do First" (urgent + important), "Schedule" (important, not urgent), "Delegate" (urgent, not important), and "Eliminate" (neither). Use hardcoded sample tasks for now and color-code each quadrant. Design it mobile-first so it looks clean on an iPhone screen. Don't add persistence or drag and drop yet. Remove the starter template content.

## Working Principles
- Build in small slices and test after each one.
- Deploy early to test the real install flow on the iPhone.
- Commit to Git after each working slice.
- Keep reminders (Phase 4) separate so the app is useful without them.
