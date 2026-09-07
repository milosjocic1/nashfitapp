import type { TextStyle } from 'react-native';

/**
 * NashFit design tokens (build-plan task 0.11).
 *
 * Source of truth: docs/nashfit-brand-guidelines.md §8. Values here should
 * match that document exactly — change the document first, then this file.
 *
 * **Dark only, deliberately.** The brand guidelines describe the app as
 * "dark-first" and supply a single palette, which is a dark one. Building a
 * light variant would mean inventing colours Nash has not approved, so there
 * is no light theme and no runtime scheme switching. If a light theme is ever
 * wanted, it comes from Nash, not from us.
 *
 * **Pending sign-off.** §7 of the guidelines flags the grey surface ramp, the
 * semantic colours, and the Lora/Inter pairing as *extensions* to Nash's
 * existing brand that still need his approval. They are implemented here
 * because the app cannot be built without them; treat them as reversible token
 * changes rather than settled identity.
 */

export const colors = {
  /** The single accent. Primary actions, active states, key highlights. */
  brandRed: '#ED070D',
  brandBlack: '#090708',

  /** Page background — the brand black from the logo. */
  surface0: '#090708',
  /** Cards and raised surfaces one level up. */
  surface1: '#161314',
  /** Higher elevation: modals, sheets, inputs. */
  surface2: '#211D1E',

  /** Hairline dividers and card edges. */
  border: '#2E2A2B',

  textPrimary: '#FFFFFF',
  textSecondary: '#B8B2B4',
  textMuted: '#7A7476',

  success: '#3B9E5E',
  warning: '#E0A82E',
  /** Deliberately distinct from brandRed so errors don't read as actions. */
  error: '#C0392B',
} as const;

/**
 * Font families, keyed to the loaded @expo-google-fonts names.
 *
 * Lora stands in for the Palatino of Nash's eBooks: a warm humanist serif,
 * app-licensed and identical across iOS and Android, which Palatino is not.
 * Inter carries functional UI, where small-size legibility matters more.
 */
export const fonts = {
  serifRegular: 'Lora_400Regular',
  serifMedium: 'Lora_500Medium',
  serifSemiBold: 'Lora_600SemiBold',
  sansRegular: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
} as const;

/**
 * The type scale from §3. Serif for reading and headings — the "authored"
 * surfaces; sans for controls and numbers, where legibility at small sizes
 * beats character.
 */
export const typography = {
  display: { fontFamily: fonts.serifSemiBold, fontSize: 28, lineHeight: 34 },
  h1: { fontFamily: fonts.serifSemiBold, fontSize: 22, lineHeight: 28 },
  h2: { fontFamily: fonts.serifMedium, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.serifRegular, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.sansRegular, fontSize: 13, lineHeight: 18 },
  /**
   * Weights, reps and set counts. `fontVariant: tabular-nums` keeps digits the
   * same width so columns align while a user scrolls their logged sets — the
   * reason the guidelines specify tabular figures for the logger.
   */
  numeric: {
    fontFamily: fonts.sansMedium,
    fontSize: 22,
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  },
  // `satisfies` rather than `as const`: it still infers the keys for
  // TypographyRole, but contextually types each entry as a TextStyle — which
  // `as const` breaks, since a readonly fontVariant array isn't assignable to
  // React Native's mutable FontVariant[].
} satisfies Record<string, TextStyle>;

export const radius = {
  control: 12,
  card: 12,
} as const;

/** Minimum comfortable touch height from §5 — used mid-workout, at arm's length. */
export const layout = {
  minTouchTarget: 48,
} as const;

export type TypographyRole = keyof typeof typography;
export type ColorToken = keyof typeof colors;

export const theme = { colors, fonts, typography, radius, layout } as const;
