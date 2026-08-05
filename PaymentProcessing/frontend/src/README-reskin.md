# Tallyn — UI re-skin

Clean, modern re-skin using Material-you / Google Sites structural language,
in a palette deliberately chosen to avoid the default fintech indigo.

Verified with `npm run build` (compiles clean) and screenshotted in Chromium
across dashboard, payments, payment history, beneficiaries, login, and dark mode.

---

## How to apply

Copy these files over your checkout, preserving paths:

```
public/index.html
src/theme.css                              (new)
src/index.css
src/Dashboard.css
src/Dashboard.js
src/App.css                                (unused — see notes)
src/components/PaymentJourney.css
src/components/CheckBalanceJourney.css
src/components/TransactionHistory.jsx
src/components/onboarding/onboarding.css
```

No new dependencies. No build config changes. `ui-reskin.diff` (alongside this
folder) is a unified diff against the original if you'd rather review hunk by hunk.

---

## The design direction

| Role | Value | Notes |
|---|---|---|
| Primary | `#0b5b65` deep teal | replaces `#4b5cff` indigo |
| Interactive | `#147a85` | links, active states |
| Accent | `#c98d14` brass | pending status, one data category |
| Canvas | `#f3f7f7` | neutrals carry a teal undertone, not blue-grey |
| Warm surface | `#f5efe3` sand | used in exactly one place: the promo panel |
| Data hues | teal / brass / sea green / plum / slate | donut, legend, spend bars, action tiles, stat tiles |

**Type:** Manrope for the interface, Noto Sans Mono for figures. Money, account
numbers, reference IDs, and PIN cells are set in mono so digits align column to
column — the one place the app is allowed to look technical.

**Shape:** pill nav items and buttons, 20px cards, 28px modals, hairline borders
with soft two-layer shadows instead of coloured glows.

---

## What changed structurally

**Everything visual resolves to a token in `src/theme.css`.** All 474 hardcoded
hex values across the stylesheets were classified by hue and chroma and rewritten
as `var(--c-…)` references. Radii and shadows were normalised the same way.
Change a value in `theme.css` and it changes everywhere.

**Dark mode is now free.** The codebase had 66 hand-written `.dark-theme`
override rules scattered through the CSS. They set nothing but colour properties,
so they were removed entirely — dark mode now comes from inverting the token
ramps in one block at the bottom of `theme.css`. There are no per-component dark
rules left to maintain.

`PaymentJourney.css` keeps its local `--journey-*` variables, but they now point
at the global tokens rather than restating colours.

---

## Bugs found and fixed along the way

These were pre-existing, not introduced by the re-skin:

1. **Notification badge / class collision.** Two unrelated components both used
   `.badge`; the payment-method chip rule (`padding: 5px 9px`) was overriding the
   notification dot, rendering it as a wide pill covering the bell icon. The
   notification dot is now `.notification-badge` (one line changed in
   `Dashboard.js`, one selector in `Dashboard.css`).

2. **"Forgot password?" rendered as a filled button.** `.onboarding-card form
   button` outspecifies `.onboarding-link-row button`, so the text link picked up
   the primary-button styling. Now scoped to win.

3. **Donut colours hardcoded in JS.** `Dashboard.js` built its conic-gradient
   from literal hex values, so it ignored the stylesheet entirely. It reads
   `var(--data-*)` now and follows the theme in both light and dark.

---

## Notes and follow-ups

- **`src/App.css` is dead code** — 710 lines, imported nowhere. `App.js` only
  renders `Dashboard` and `OnboardingWizard`, which import their own stylesheets.
  It's included here token-migrated so it stays consistent if you ever wire it
  up, but deleting it is the better move.

- **Fonts load from Google Fonts** via a `<link>` in `index.html`. If you'd
  rather self-host — one fewer third-party request, defensible for a banking
  app — `npm i @fontsource/manrope @fontsource/noto-sans-mono`, import them in
  `index.js`, and drop the `<link>`. The token stack in `theme.css` needs no
  change either way.

- **On the mono choice:** Roboto Mono was the first pick, but it carries no
  rupee glyph (`U+20B9`) in any subset, so every amount would fall back to a
  system font for the currency symbol. Noto Sans Mono covers it and has a plain
  unslashed zero. If you swap the face, check `U+20B9` coverage first.

- **Manrope has a narrow word space**, which negative letter-spacing closes up
  completely — two-word headings render as "QuickActions". `theme.css` sets
  `word-spacing: 0.12em` on headings to compensate. Keep that if you adjust the
  tracking.

- **Screens verified:** dashboard (light + dark), payments, payment history,
  beneficiaries, login, welcome splash. The backend wasn't running, so
  data-dense states (populated tables, the review/authorise/success steps of the
  payment journey) were styled but rendered empty. Worth a look with real data
  before shipping.
