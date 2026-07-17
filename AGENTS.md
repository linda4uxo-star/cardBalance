# Agent Notes

## Landing Page

The root path (`/`) reads the `active_landing_page` setting from the `app_settings` table in Supabase and redirects accordingly.

- If the value is `"404"`, the root path returns a standard Next.js 404 page.
- The default fallback is `/visa-id`.
- The landing page selector in the qazmlp dashboard allows changing this value.
