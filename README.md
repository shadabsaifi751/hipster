# Spa & Wellness Booking Management (Frontend)

Single-page app for outlet scheduling: virtualized calendar, booking details, cancel/delete flows, and authenticated API access to the Natureland dev backend.

## Tech stack

- **React 19** with **Vite** (fast dev/build; CRA-equivalent workflow)
- **TanStack Query** for server state, caching, and invalidation
- **Zustand** for UI state (sidebar, date, search, outlet)
- **Tailwind CSS** for styling
- **@dnd-kit** for drag-and-drop on booking blocks
- **react-window** (`FixedSizeGrid`) for the time × therapist grid
- **Axios** with interceptors (`src/api/axios.js`)
- **react-helmet-async** for document title/meta

## Folder structure

| Path | Role |
|------|------|
| `src/api/axios.js` | Shared Axios instance: `/api/v1` base path, bearer token, timeout, FormData headers |
| `src/api/bookingApi.js` | Login, bookings list, booking detail, therapists, CRUD/cancel/status helpers |
| `src/components/calendar/` | Virtual grid + draggable blocks |
| `src/components/forms/` | Booking side panel (create placeholder, detail, cancel/delete modals) |
| `src/components/layout/` | Header + sub-header |
| `src/components/common/` | Modal, error boundary |
| `src/hooks/` | `useBookings`, `useAuth`, `useDebounce`, `useVirtualGrid`, `useBookingActions` |
| `src/store/useBookingStore.js` | UI state (no server data) |
| `src/utils/` | Constants, helpers (calendar mapping), logging |
| `src/pages/` | `Dashboard` entry view |

## State management

- **Server state**: React Query (`bookings`, `therapists`, `booking-detail` keys). List queries are invalidated after mutations (cancel, delete, status change).
- **UI state**: Zustand (`selectedDate`, `searchQuery`, sidebar open/mode, `activeBookingId`, `outletId`).
- **Optimistic reschedule**: Dragging a block updates the React Query cache for the current day, then refetches bookings so the UI stays aligned with the server when the API accepts updates. Full edit payloads for create/update follow the backend multipart contract (see Postman collection).

## Performance strategy

- **Grid**: `react-window` `FixedSizeGrid` for cells; booking “cards” are rendered only for rows/columns intersecting the scroll viewport (fewer DOM nodes under heavy load).
- **Components**: `React.memo` on booking blocks; memoized inner grid layer; stable handlers where possible.
- **Data**: Query `staleTime` for list/therapists; avoid refetch on window focus by default.
- **Code splitting**: Route-level `React.lazy` for `Dashboard` in `App.jsx`.

## API setup

1. Copy `.env.example` to `.env` and adjust if needed.
2. Base host defaults to `https://dev.natureland.hipster-virtual.com`. All routes use the **`/api/v1`** prefix (see assessment Postman collection).
3. On first load without a token, the app logs in with the assessment credentials (`login` multipart: `email`, `password`, `key_pass`) and stores `Bearer` token in `localStorage` as `auth_token`.

### Main endpoints used

- `POST /api/v1/login`
- `GET /api/v1/bookings/outlet/booking/list` — calendar list (`daterange`, `outlet`, `panel`, `view_type`)
- `GET /api/v1/bookings/booking-details/{id}`
- `GET /api/v1/therapists` — column headers (availability/outlet/service_at)
- `POST /api/v1/bookings/create` — multipart (full payload per Postman)
- `POST /api/v1/bookings/{id}` — edit (multipart)
- `POST /api/v1/bookings/item/cancel` — multipart (`company`, `id`, `type`, `panel`)
- `DELETE /api/v1/bookings/destroy/{id}`
- `POST /api/v1/bookings/update/payment-status` — status transitions (e.g. check-in / completed)

## How to run locally

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | API host (no trailing slash) |
| `VITE_OUTLET_ID` | Default outlet for list/therapists |
| `VITE_COMPANY_ID` | Used in cancel/status requests |
| `VITE_OUTLET_TYPE` | Therapist list filter |
| `VITE_LOGIN_*` | Dev login overrides |

## Assumptions

- Assessment **Postman** contract is authoritative: list path is **`/bookings/outlet/booking/list`**, not `GET /bookings` at root.
- Login returns token at **`response.data.data.token.token`**; therapists list is under **`data.list.staffs`**; bookings list under **`data.list.bookings`**.
- Create/update bookings require **multipart form** fields matching Postman (`items` as JSON string, etc.); the UI includes a create placeholder and documents wiring to `POST /bookings/create`.
- Drag-and-drop updates the cache immediately; persisting reschedules to the server requires the same rich `items` payload as the official edit endpoint.
- The project uses **Vite** (not legacy CRA) for React 19 compatibility and build speed; behavior matches the assessment SPA requirements.

## Deploy (Vercel / Netlify)

- Build command: `npm run build`
- Output directory: `dist`
- Set the same `VITE_*` environment variables in the host dashboard.
