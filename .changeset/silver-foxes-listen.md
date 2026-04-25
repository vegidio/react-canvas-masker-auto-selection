---
"react-canvas-masker-auto-selection": patch
---

Include the project README and LICENSE in the published tarball. The package directory deliberately has no checked-in copies of these files; `prepack` now copies them from the repo root before publish, and `postpack` cleans up afterwards.
