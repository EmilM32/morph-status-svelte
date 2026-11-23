# Changelog

All notable changes to this package are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/EmilM32/morph-status-svelte/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/EmilM32/morph-status-svelte/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/EmilM32/morph-status-svelte/releases/tag/v0.1.0
