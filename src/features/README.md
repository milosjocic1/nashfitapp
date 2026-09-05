# features

Feature-scoped code, one folder per epic from `docs/nashfit-v1-user-stories.md` —
e.g. `auth/`, `subscription/`, `library/`, `onboarding/`, `plan/`, `logging/`.

A feature folder owns its own components, hooks, and data access. Anything two
features both need moves up to `src/components`, `src/lib`, or `src/utils`.

Routes in `app/` should stay thin: they compose from here.
