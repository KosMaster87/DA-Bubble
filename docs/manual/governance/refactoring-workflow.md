# Refactoring Workflow — Structure, Helpers, Services, Barrels

Use this workflow for larger DA-Bubble refactorings that extract functions, reorganize folders, or introduce barrel files.

## Goals

- Keep responsibilities in the correct layer.
- Reduce file size and cognitive load without introducing parallel architecture.
- Make imports and public boundaries clearer.
- Leave behind documentation that points to the new structure.

## Workflow

1. Identify the owning layer first.
   - `core/` for foundational services, guards, models, and infrastructure
   - `features/` for feature-scoped UI and page logic
   - `shared/` for reusable presentation and cross-feature UI helpers
   - `stores/` for state ownership, write methods, derived state, and store helpers

2. Separate the logic by responsibility before moving files.
   - Pure mapping, formatting, parsing, and collection transforms go to helper files.
   - I/O, subscriptions, orchestration, and side effects go to service files.
   - State ownership stays in stores.

3. Define the target folder structure before editing imports.
   - Create the smallest folder split that explains the domain.
   - Prefer folders by responsibility over folders by file type when the domain is already clear.
   - Keep related tests close enough to move with the code.

4. Move one coherent slice at a time.
   - Extract helper functions first when they are pure.
   - Extract orchestration services only when a real boundary exists.
   - Update consumers together with the moved code.

5. Add a barrel file only when it creates a real public boundary.
   - Use `index.ts` for code exports.
   - Use `INDEX.md` for folder documentation.
   - Do not introduce a barrel just because a folder exists.

6. Re-run narrow validation after each slice.
   - impacted tests first
   - then narrow typecheck or project test command
   - then manual spot checks for affected flows when needed

## Barrel File Guidance

Create `index.ts` when all of these are true:

- the folder has more than one consumer-facing export
- imports should stop reaching into private internals
- the export surface is stable enough to be named deliberately

Do not create `index.ts` when one of these is true:

- the folder contains only one file
- consumers still need deep internal imports
- the barrel would re-export unstable private implementation details
- the barrel would create circular dependencies or hide the true owner of the code

## Documentation Rule

- Project-local structure and workflow docs belong in `docs/manual/`.
- Shared Copilot customization rules belong in `.github/`.
- If a refactor changes how a domain is structured, update the nearest relevant `INDEX.md` in `docs/manual/`.

## Refactoring Checklist

- Owning layer identified before the move
- Helper vs service boundary stated explicitly
- Store ownership preserved
- Imports simplified, not obscured
- `index.ts` added only where it defines a public boundary
- `INDEX.md` updated where readers need navigation help
- Tests updated for moved behavior
- No commit or push before the slice is validated
