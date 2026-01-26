# Doctor Schedule Flow (Backend + Frontend)

## What this covers
- How working days and time slots are stored and served
- APIs involved for doctors to manage availability
- Frontend flow in the doctor portal for toggling days, setting hours, and saving slots

## Prerequisites
- Doctor user must be authenticated (JWT bearer token). Backend accepts the doctor id from the token (`sub`) or from an `x-doctor-id` header (mainly for admin/testing).
- Environment: `environment.apiUrl` points to the backend (e.g., `http://localhost:3000/api`).

## Data model (availability)
- Table: `doctor_settings` ([backend/src/settings/entities/doctor-settings.entity.ts](backend/src/settings/entities/doctor-settings.entity.ts))
  - `availableDays: string[]` (e.g., `['Monday', 'Wednesday']`).
  - `startTime: string`, `endTime: string` (e.g., `09:00`, `17:00`).
  - `appointmentDuration: number` in minutes.
- Slots are persisted per day in `doctor_schedule` (entity not shown here). Each slot stores `startTime`, `endTime`, `status` (`available|blocked|booked`), and optional `appointmentId`.

## Key APIs (doctor-facing)
Controller: [backend/src/schedules/schedules.controller.ts](backend/src/schedules/schedules.controller.ts)

- `GET /doctors/schedule/:date` — get day schedule for the authenticated doctor.
- `POST /doctors/schedule/available` — mark a slot/range as available. Body: `{ date, startTime, endTime? }` or `{ date, time }`.
- `POST /doctors/schedule/block` — block a slot/range. Body like above plus optional `reason`.
- `POST /doctors/schedule/unblock` — unblock a slot/range.
- `POST /doctors/schedule/remove` — delete a slot/range entry.
- `GET /doctors/schedule/overview` — month overview of saved schedules.
- `GET /doctors/schedule/blocked-days` — dates with blocked slots in a month.
- `GET /doctors/schedule/working-days` — list of working day numbers (0=Sun .. 6=Sat) from settings.
- `POST /doctors/schedule/working-days` — update working day numbers. Body: `{ days: number[] }`. Sanitized to 0–6 and requires doctor id.
- Public (patient-facing): `GET /doctors/schedule/public/:doctorId/:date`, `GET /doctors/schedule/public/:doctorId/week/:startDate`, `GET /doctors/schedule/public/:doctorId/available-dates`.

## Slot generation rules (backend service)
Service: [backend/src/schedules/schedules.service.ts](backend/src/schedules/schedules.service.ts)
- Base slots are generated from doctor settings (`startTime`, `endTime`, `appointmentDuration`) **only on working days** (`workingDays` in settings). Non-working days return no base slots.
- Stored slots (saved available/blocked) are merged with base slots.
- Booked slots from appointments are merged with highest priority.
- Priorities: booked > blocked > available. Overlapping ranges replace lower-priority entries.
- Past slots are auto-marked as blocked when fetching a day.

## Frontend doctor portal flow
Component: [frontend/src/app/features/doctor/schedule/schedule.component.ts](frontend/src/app/features/doctor/schedule/schedule.component.ts)
- Signals `workingDays`, `workingStart`, `workingEnd`, `slotDurationMinutes` drive the UI.
- `loadSettings()` pulls `availableDays/start/end/duration` from settings and maps day names to numbers.
- `loadWorkingDays()` calls `GET /doctors/schedule/working-days` to seed `workingDays`.
- `toggleWorkingDay(d)` mutates the `workingDays` set in the UI.
- `saveAvailability()`:
  1) `scheduleService.updateWorkingDays(days)` → `POST /doctors/schedule/working-days` (updates `workingDays`).
  2) `settingsService.updateSettings({ availableDays, startTime, endTime, appointmentDuration })` to persist hours/duration.
  3) On success, reloads slots.
- Day view uses `scheduleService.getDaySchedule(date)` to fetch merged slots and renders them. Actions:
  - Block slot → `POST /doctors/schedule/block`.
  - Remove slot → `POST /doctors/schedule/remove`.
- Week and month views show summaries; actual slot editing is on the day view.

## Minimal setup checklist (doctor)
1) Log in as a doctor (ensure a valid JWT is stored; interceptor sends `Authorization: Bearer <token>`).
2) Open Doctor Portal → Schedule.
3) Pick working days (toggle buttons) and set start/end time + slot duration.
4) Click **Save** (updates working days + settings).
5) On the calendar, select a date and add/adjust slots (block/remove) as needed.

## Sample cURL calls
Replace `TOKEN` with a doctor JWT.

- Update working days to Mon–Fri:
```
curl -X POST "http://localhost:3000/api/doctors/schedule/working-days" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days":[1,2,3,4,5]}'
```

- Mark a 09:00–12:00 slot as available on 2026-01-22:
```
curl -X POST "http://localhost:3000/api/doctors/schedule/available" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-01-22","startTime":"09:00","endTime":"12:00"}'
```

- Block a single 14:00 slot with reason:
```
curl -X POST "http://localhost:3000/api/doctors/schedule/block" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-01-22","time":"14:00","reason":"Lunch"}'
```

## Common errors
- `401 Unauthorized`: token missing/expired; ensure login and interceptor sending the header.
- `400 Bad Request`: doctor id missing (happens if JWT is absent) or invalid day numbers.
- Empty slots on a day: day is not in `workingDays`, or `start/end/duration` not set in settings.

## Where to change things
- Backend logic: [backend/src/schedules/schedules.service.ts](backend/src/schedules/schedules.service.ts)
- Controller routes: [backend/src/schedules/schedules.controller.ts](backend/src/schedules/schedules.controller.ts)
- Doctor portal UI/logic: [frontend/src/app/features/doctor/schedule/schedule.component.ts](frontend/src/app/features/doctor/schedule/schedule.component.ts) and template [frontend/src/app/features/doctor/schedule/schedule.component.html](frontend/src/app/features/doctor/schedule/schedule.component.html)
- HTTP client: [frontend/src/app/core/services/schedule.service.ts](frontend/src/app/core/services/schedule.service.ts)
- Auth header injection: [frontend/src/app/core/interceptors/auth.interceptor.ts](frontend/src/app/core/interceptors/auth.interceptor.ts)
