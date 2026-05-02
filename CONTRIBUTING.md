# Contributing

Thanks for taking time to improve HBX-ED.

## Requirements

- Node.js `^20.19.0 || ^22.12.0 || >=24.0.0`
- npm

CI uses Node 24.

## Local Setup

```sh
npm ci
npm run dev
```

## Tech Stack

- TypeScript
- Vite
- DOM APIs
- Canvas 2D
- JSON5
- Vitest + jsdom
- Biome

HBX-ED intentionally stays framework-free. Prefer plain TypeScript modules and small DOM helpers over introducing new UI frameworks or large runtime dependencies.

## Scripts

```sh
npm run dev
npm run build
npm run preview
npm run typecheck
npm run lint
npm run format
npm run test
npm run test:watch
npm run test:coverage
npm run check
```

`npm run check` runs TypeScript, Biome, and the Vitest suite. `npm run test:coverage` generates a V8 coverage report in `coverage/`.

CI uploads `coverage/lcov.info` to Codecov for the README coverage badge. Public repositories may work tokenless depending on Codecov organization settings; otherwise add `CODECOV_TOKEN` as a GitHub repository secret.

## Quality Gate

Before opening a pull request, run:

```sh
npm run check
npm run build
npm run test:coverage
```

## Project Structure

```text
src/
  app/          DOM/app wiring extracted from App
  core/         Stadium parsing, history, validation, hit testing, and mutations
  data/         Built-in classic stadium and templates
  renderer/     Canvas renderers and textures
  tools/        Editor tools for creating and manipulating stadium objects
  ui/           Reusable DOM UI components and property panel sections
  utils/        Math and color helpers
```

## Testing

Keep tests close to the code they cover as `*.test.ts`.

The current test strategy focuses on:

- pure unit tests for parsing, serialization, validation, math, color, history, and stadium operations
- focused jsdom tests for app bindings and UI components
- canvas/renderer tests with mocked canvas behavior

## Development Notes

- Keep the app plain TypeScript, Vite, DOM, and Canvas 2D.
- Prefer extracted, testable logic in `src/core`, `src/app`, `src/tools`, and `src/ui` over adding behavior directly to `App`.
- Preserve existing DOM IDs, keyboard shortcuts, HBS file compatibility, canvas behavior, and toolbar behavior unless a change intentionally updates them.
- Keep behavior changes covered by tests, especially parsing, serialization, deletion/reindexing, validation, and editor mutations.

## Pull Request Checklist

- [ ] The change is scoped and does not include unrelated refactors.
- [ ] Tests were added or updated for behavior changes.
- [ ] `npm run check` passes.
- [ ] `npm run build` passes.
- [ ] `npm run test:coverage` passes.
- [ ] User-facing behavior is described in the PR when relevant.
