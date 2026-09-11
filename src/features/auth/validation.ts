/**
 * Client-side auth form validation (task 1.1).
 *
 * This is for fast feedback only. Supabase enforces its own rules server-side,
 * and that is the real boundary — never treat passing validation here as
 * proof a credential is acceptable.
 */

/**
 * Deliberately permissive. Strict email regexes reject valid addresses
 * (apostrophes, new TLDs, plus-addressing) and the only real test is whether
 * the confirmation email arrives. This catches typos like a missing @, nothing
 * more.
 */
export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Enter your email address.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'That does not look like an email address.';
  }
  return undefined;
}

/**
 * Supabase's own default minimum is 6. Eight is used here as a floor that is
 * meaningfully better without being an obstacle; if this ever changes, the
 * project's Auth settings must change with it or the two will disagree and the
 * server will reject something the client accepted.
 */
export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(password: string): string | undefined {
  if (!password) {
    return 'Choose a password.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return undefined;
}
