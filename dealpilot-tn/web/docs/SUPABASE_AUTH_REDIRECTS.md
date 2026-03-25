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

Optional (Vercel preview deploys, if your project allows wildcards):

4. `https://*.vercel.app/api/auth/callback`

**Code:** `googleOAuthRedirectTo()` in `src/lib/auth-constants.ts` uses these exact production strings.

**Middleware:** `/api/auth/callback` is excluded from Supabase session refresh in `middleware.ts` so PKCE cookies are not altered before `exchangeCodeForSession` runs.

## Google Cloud OAuth client

In **Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client**:

- **Authorized JavaScript origins:** include `https://dealpilot-tn.vercel.app` (and localhost for dev if needed).
- **Authorized redirect URIs:** include **Supabase’s** callback (not the Vercel app URL), e.g.  
  `https://<PROJECT_REF>.supabase.co/auth/v1/callback`

Supabase then redirects the user to one of the **Redirect URLs** listed above after sign-in.
