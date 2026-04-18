# Coaching by Professionals — daily lesson videos

This tree reserves **one folder per calendar day** so you can drop in lesson files without renaming paths in code.

## Layout

- **`YYYY-MM-DD/`** — local calendar day (same string as the app’s **day key** when a coach picks that date).
- Inside each day folder, place your file as:

  **`lesson.mp4`**

  The app resolves the public URL as `/coaching-daily-videos/{dayKey}/lesson.mp4` (see `getLessonVideoUrl` in `src/lib/coaching-lesson-assets.ts`).

## Current batch

Folders are pre-created for **365 consecutive days** starting **2026-04-16** (inclusive). Extend by adding more `YYYY-MM-DD` folders alongside these if you need a longer runway.

## Git and file size

Video files are large. Prefer **[Git LFS](https://git-lfs.github.com/)** (or host on a CDN / object storage and point `getLessonVideoUrl` to signed URLs) for production so the repo stays cloneable.

## Optional assets

You may add sidecars in the same day folder (e.g. `poster.jpg`, `captions.vtt`); the app only reads `lesson.mp4` unless you extend `coaching-lesson-assets.ts`.
