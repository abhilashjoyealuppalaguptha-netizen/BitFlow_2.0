# pixelfx (vendored)

Pixel-art effects as code, by Patch: https://github.com/patch-gg/pixelfx (MIT, see `LICENSE`).

- Pinned commit: `a84159688af3ca37a4be05a0d422b94451b2e24e`
- Copied: `src/core/*` → `core/`, and `src/fx/ui/{_lib,quest-complete,level-up,achievement,confetti,coin-collect}.js` → `fx/ui/`
- Used by `lib/pixel/celebrate.ts` only, which loads with the first celebration (never in a page's first bundle).

## Local changes

- `fx/ui/coin-collect.js`: two options, both defaulting to the original behaviour:
  `step` (what each landed coin adds to the counter, default 1) and `prefix` (the counter's prefix, default `"x"`),
  so the counter can count XP ("+25").

To update: copy the same files from a newer commit, re-apply the changes above, and run `npm run check-pixel`.
