# Coaching by Professionals — daily lesson videos (program days)

Lessons are keyed by **program day** since the user’s account was created (**day 1 = signup day** in their local calendar), not by a fixed global calendar date. The same file is “video 1” for everyone; only the calendar date on which it unlocks differs per user.

## Layout

- **`day-001/`** … **`day-365/`** — `001` = first day of the programme for that user, `002` = second day, etc.
- Put the file in each folder as:

  **`lesson.mp4`**

- The app builds the public URL as  
  `/coaching-daily-videos/day-NNN/lesson.mp4`  
  where `NNN` is derived from the selected calendar date and the user’s account anchor (`createdAt`). See `getLessonVideoUrl` in `src/lib/coaching-lesson-assets.ts` and `src/lib/coaching-program-day.ts`.

## Skill catalogue

`COACHING_LESSON_DEVELOPMENTS` in `src/lib/coaching-development-registry.ts` should use the same ids (`day-001`, …) so the Skill Development Table matches completed lessons.

## Git and file size

Video files are large. Prefer **[Git LFS](https://git-lfs.github.com/)** or a CDN / object storage for production.

## Optional assets

Sidecars (e.g. `poster.jpg`) can live next to `lesson.mp4`; only `lesson.mp4` is read by the app unless you extend `coaching-lesson-assets.ts`.
