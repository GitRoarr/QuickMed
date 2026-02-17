# Roadmap for Deployment: QuickMed

This document outlines the steps to deploy the QuickMed application, with the backend on **Railway** and the frontend on **Vercel**.

## 1. Backend Deployment (Railway)

### A. Environment Configuration
Add the following Environment Variables in the Railway Dashboard:

| Variable | Recommended Value (Production) |
| :--- | :--- |
| `PORT` | `3000` (Railway will assign this automatically) |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Your production Database URL (e.g., Supabase or Railway Postgres) |
| `DB_SSL` | `true` |
| `JWT_SECRET` | A strong, unique string |
| `FRONTEND_URL` | Your Vercel production URL (e.g., `https://quickmed.vercel.app`) |
| `BACKEND_URL` | Your Railway production URL (e.g., `https://quickmed-production.up.railway.app`) |
| `CLOUDINARY_CLOUD_NAME` | (From your settings) |
| `CLOUDINARY_API_KEY` | (From your settings) |
| `CLOUDINARY_API_SECRET` | (From your settings) |
| `SENDGRID_API_KEY` | (From your settings) |
| `EMAIL_FROM` | `QuickMed <your-verified-email@domain.com>` |

### B. Railway Deployment Steps
1.  **Login** to [Railway.app](https://railway.app/).
2.  **New Project** -> **Deploy from GitHub repo**.
3.  Select your repository.
4.  **Root Directory:** Set this to `backend`.
5.  Railway will detect the NestJS app. It should automatically run:
    *   **Build Command:** `npm run build`
    *   **Start Command:** `npm run start:prod`
6.  Once deployed, copy the **Public Domain URL** provided by Railway. You will need this for the frontend configuration.

---

## 2. Frontend Deployment (Vercel)

### A. Preparation: Dynamic API URL
To ensure the frontend connects to the production backend, prioritize these values in `frontend/src/environments/environment.prod.ts`:

```typescript
// frontend/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: "https://your-backend-url.railway.app/api", // Replace with actual Railway URL
  stripePublishableKey: "...",
  supabaseUrl: "...",
  supabaseAnonKey: "...",
  googleClientId: "...",
  googleRedirectUri: "https://your-frontend-url.vercel.app/auth/callback"
};
```

### B. Vercel Deployment Steps (Reference Screenshot provided)
1.  **Login** to [Vercel](https://vercel.com/).
2.  **Add New Project** -> **Import** your GitHub repository.
3.  **Project Name:** `quickmed`
4.  **Framework Preset:** Select `Angular`.
5.  **Root Directory:** Click "Edit" and select the `frontend` folder.
6.  **Build & Output Settings:**
    *   **Build Command:** `ng build`
    *   **Output Directory:** `dist/quickmed-frontend/browser` (Based on your `angular.json`, this is where the production build is generated).
7.  **Environment Variables:**
    *   Add any variables if your build process requires them (though Angular mostly uses environment files).
8.  **Deploy:** Click "Deploy".

---

## 3. Post-Deployment Verification
1.  **CORS Headers:** Ensure the Backend allows requests from the Vercel domain.
2.  **Redirect URIs:** Update Google Cloud Console and Stripe with your new production URLs.
3.  **Database Migrations:** Ensure the production database has the latest schema.

---

## Summary Checklist
- [ ] Backend deployed to Railway using `backend` as root.
- [ ] Railway Public URL copied.
- [ ] Frontend API URL updated in `environment.prod.ts`.
- [ ] Frontend deployed to Vercel using `frontend` as root.
- [ ] `BACKEND_URL` and `FRONTEND_URL` cross-referenced in environment variables.
