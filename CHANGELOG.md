# Changelog

All notable changes to this package are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
