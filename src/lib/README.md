# lib

Client-side integrations and shared infrastructure: the Supabase client,
Edge Function callers, analytics (PostHog) and error reporting (Sentry) helpers.

**No secrets here.** This code ships in the client bundle. Anything holding an
API key or service-role key belongs in a Supabase Edge Function — see CLAUDE.md.
