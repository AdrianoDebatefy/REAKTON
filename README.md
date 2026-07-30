# REAKTON WEBSITE 2026

Official website for **REAKTON** — Robotronic music from Berlin.

> **Project name:** REAKTON WEBSITE 2026  
> **Repository:** https://github.com/AdrianoDebatefy/REAKTON  
> **Local folder (Windows):** `C:\Users\adria\REAKTON`  
> **Not to be confused with:** Debatefy / DAWERSION (separate projects)

## Design

**Direction D — Halbton Horizon:** cinematic gradients, halftone grain, soft transitions. Three expandable album worlds:

| World | Theme | Color |
|-------|--------|-------|
| Weltall:Erde:Mensch | Cosmos, Earth, humanity | Blue |
| Micro:Macro:Nano | Nanorobotics, nano dust | Silver |
| Clip:Clap:Club | Club (locked until Nov 2026) | Red |

## Stack

- Next.js 14 (App Router)
- TypeScript, Tailwind CSS
- next-intl (DE/EN)
- Framer Motion
- JSON content store + admin API

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Admin

- URL: `/admin`
- Default password: `reakton-admin` (set `ADMIN_PASSWORD` and `ADMIN_SECRET` in production)
- Change password after login: Admin → tab **Zugang** (stored in `data/admin.local.json`)

Content is stored in `data/site-content.json`. Add worlds, songs, press entries, and links without code changes.

## Contact form

- Header **Kontakt** → `/contact`
- Submissions are saved as JSON on the server: `data/messages/{timestamp}.json` (not emailed by default)
- On Vercel/serverless, use persistent storage or email forwarding — files in `data/messages/` are gitignored

## Environment

```bash
ADMIN_PASSWORD=your-secure-password
ADMIN_SECRET=your-jwt-secret
```

## Legal

- Impressum and Datenschutz pages included (update content in `site-content.json`)
- Cookie banner blocks YouTube embeds until consent

## Clap-Toy

Placeholder section on homepage links to `reakton.de/clap-toy` (configurable in admin JSON).
