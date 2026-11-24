# Changelog

All notable changes to this package are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `a11y` prop: `'polite'` (default), `'assertive'`, `'image'` or `'hidden'`.
  - `'image'` is a static image named after its state (`role="img"`, `aria-label`) that never announces, for lists and tables. Before, the only way to silence an icon was to hide it, which left it with no text alternative.
  - `'assertive'` interrupts, for outcomes the user must hear at once.
- Any other attribute goes to the root `<span>`: `id`, `title`, `style`, `data-*`, `aria-describedby`, event handlers. `class` takes Svelte's class values (arrays, objects).
- `A11Y_MODES` and the `StatusA11y` type.

### Changed

- `label` now names what the icon is about and goes in front of the state's name: `label="Upload"` reads "Upload: Loading". Before, it replaced every state's name, so a live icon with a `label` never announced a change.
- A live icon mounted in a non-idle state, or switched to a live mode, fills its text about 150 ms later, so screen readers announce it. Before, that text arrived together with the region and was skipped. Server-rendered markup leaves such a region empty until the client fills it. An idle icon on mount stays quiet, as before.
- Empty or blank `label` and `labels` entries count as unset.

### Deprecated

- `announce`. Use `a11y`. `announce={true}` is `a11y="polite"` and `announce={false}` is `a11y="hidden"`. `a11y` wins when both are set.

### Fixed

- The visually hidden text also uses `clip-path`, as the old `clip` property is deprecated.

### Internal

- Demo: the Save example keeps focus on its button (`aria-disabled` instead of `disabled`) and announces the outcome in a live region next to it. Before, a screen reader heard nothing.

## [0.2.0] - 2026-11-24

### Changed

- **Colors are CSS now.** The stroke is drawn in `currentColor`, and the icon's stylesheet picks the color for the current state. It eases over a CSS transition instead of a second spring.
- `colors` accepts any CSS color: hex, `rgb()`, `hsl()`, `oklch()`, named colors, `currentColor` and `var(--token)`. Before, anything but hex or `rgb()` silently fell back to gray, and an alpha channel was dropped.
- Colors can be themed for a whole subtree with `--morph-status-idle`, `--morph-status-loading`, `--morph-status-success`, `--morph-status-error` and `--morph-status-warning`. `--morph-status-color-duration` sets the transition (default `400ms`).
- **Default colors follow `color-scheme`.** A new light set (`DEFAULT_COLORS_LIGHT`) is used on light or unset schemes, and the previous colors (`DEFAULT_COLORS_DARK`) on `color-scheme: dark`. Each holds at least 3:1 against its background. The old defaults reached only 1.4:1 (warning) and 2:1 (success) on white. A dark page that does not declare `color-scheme: dark` now gets the light set. Declare it, or pass `colors`.
- `oncomplete` fires when the shape settles. The color transition runs on its own CSS timing.

### Added

- `DEFAULT_COLORS_LIGHT` and `DEFAULT_COLORS_DARK`. `DEFAULT_COLORS` stays as a deprecated alias of the dark set.
- Under `forced-colors: active` (Windows High Contrast) the icon is drawn in the system text color. Before, it kept its own color, which could vanish against a high-contrast background.
- Reduced motion also turns off the color transition.

## [0.1.2] - 2026-11-24

### Fixed

- Interrupting a morph (a new `state` before the last one settled) no longer leaves an unhandled `Error: Aborted` promise rejection in the console and in error trackers.
- `oncomplete` now fires when `colors` change, or reduced motion turns on, in the middle of a morph. Before, that morph never reported completion.
- `stiffness={0}` or `damping={0}` no longer leaves the spring running forever without settling. Stiffness is clamped to `0.02–1` and damping to `0.05–1`.
- A non-finite `size`, `strokeWidth`, `stiffness` or `damping` (`NaN`, `Infinity`) falls back to the default instead of rendering `width="NaN"` or freezing the spring. Numeric strings are still accepted.
- The `svelte` peer dependency is now `^5.29.0`, the first version that compiles the component. `^5` let 5.0–5.28 install and then fail to build.

### Changed

- The Node version requirement moved from `engines` to `devEngines`. It applies to working on this repo, not to apps that install the package.
- `docs/demo.png` is no longer in the npm package (it was about 96% of the unpacked size). The README loads it from GitHub.

### Internal

- Component tests mount `MorphStatus` in jsdom with real springs: callback order, interrupted morphs, colors or reduced motion changing mid-morph, unmount, spring floors, the spinner, non-finite props and the live region. Unit tests now also cover the completion tracker and the SSR markup. `npm test` runs both as two Vitest projects (`unit`, `dom`).
- CI on GitHub Actions: lint, types, tests, package and publint on Node 22 and 24, plus a job that compiles the components with the oldest Svelte in the peer range (`scripts/check-svelte-compat.mjs`).
- Releases publish from a `v*` tag with npm trusted publishing and provenance. `prepublishOnly` now runs the full `npm run verify`, not only the package build.

## [0.1.1] - 2026-10-27

### Fixed

- When a two-stroke mark (error, warning) morphs into a one-stroke mark (idle, loading, success), the stroke that collapses no longer leaves a dot behind for ~100 ms. It now fades out as it shrinks. Resting marks look the same as before.

### Internal

- Unit tests (Vitest) for the geometry and status helpers. Run them with `npm test`.
- Demo page: icons keep their contrast on the selected state in every color preset, Play/Pause is set apart from the states, the large icon no longer announces while autoplay runs, and the Save example uses colors meant for a light button.

## [0.1.0] - 2026-10-27

### Added

- First release of `MorphStatus`, a status icon for Svelte 5. One stroke morphs between `idle`, `loading`, `success`, `error` and `warning` on a spring, and its color shifts with it.
- Props: `state`, `size`, `strokeWidth`, `colors`, `stiffness`, `damping`, `label`, `labels`, `announce`, `onchange`, `oncomplete`, `class`.
- Exports `DEFAULT_COLORS`, `DEFAULT_LABELS`, `DEFAULT_SIZE`, `DEFAULT_STROKE`, `DEFAULT_STIFFNESS`, `DEFAULT_DAMPING`, `STATUS_STATES`, and the types `MorphStatusProps`, `StatusColors`, `StatusName`.
- Respects `prefers-reduced-motion`.

[Unreleased]: https://github.com/EmilM32/morph-status-svelte/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/EmilM32/morph-status-svelte/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/EmilM32/morph-status-svelte/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/EmilM32/morph-status-svelte/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/EmilM32/morph-status-svelte/releases/tag/v0.1.0
