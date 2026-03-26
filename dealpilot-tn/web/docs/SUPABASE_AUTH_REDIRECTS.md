# Supabase + Google OAuth (production)

Deploy host: `https://dealpilot-tn.vercel.app`

## Site URL

In **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL:** `https://dealpilot-tn.vercel.app`

## Redirect URLs

Under **Redirect URLs**, include (one per line):

1. `https://dealpilot-tn.vercel.app/api/auth/callback`
2. `https://dealpilot-tn.vercel.app/api/auth/callback?next=%2Fchat` (login → Google)
3. `https://dealpilot-tn.vercel.app/api/auth/callback?next=%2Fonboarding` (signup → Google)
4. `https://dealpilot-tn.vercel.app/api/auth/callback?next=%2Freset-password` (forgot password → email link)

Optional (Vercel preview deploys, if your project allows wildcards):

5. `https://*.vercel.app/api/auth/callback` (and matching `?next=...` variants if you use previews)

**Code:** `oauthRedirectTo()` and `passwordResetCallbackRedirectTo()` in `src/lib/auth-constants.ts` build these URLs.

**Middleware:** `/api/auth/callback` returns immediately without calling `getUser()` so auth cookies are not rewritten before `exchangeCodeForSession` runs in the route handler.

## Google Cloud OAuth client

In **Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client**:

- **Authorized JavaScript origins:** include `https://dealpilot-tn.vercel.app` (and localhost for dev if needed).
- **Authorized redirect URIs:** include **Supabase’s** callback (not the Vercel app URL), e.g.  
  `https://<PROJECT_REF>.supabase.co/auth/v1/callback`

Supabase then redirects the user to one of the **Redirect URLs** listed above after sign-in.
