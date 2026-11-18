# THE COLLECTOR: Causal Narrative Research

**An MIT-licensed open-source toolkit for causal narrative branches, inspectable choice evidence, and offline testing of interactive story state.**

This public research component comes from a longer-running THE COLLECTOR creative software project. It explores whether a player's action genuinely changes a fictional world, whether an outcome has an inspectable cause, and whether two choices create distinct future states.

**Current status:** Independent runnable core, synthetic demonstrations and automated tests. Early-stage research without demonstrated outside adoption, a published npm package or a production-ready generative AI director. The tests do not establish artistic excellence or personal AI generation.

## Run the standalone toolkit

Requires Node.js 24+. No keys, Codex credits, paid models or personal inputs.

~~~sh
npm install
npm run demo:core
npm run test:core
~~~

The demo compares two choices, prints a changed world state and shows a causal evidence trail. GitHub Actions runs the public tests on push.

## Reusable components

| Resource | What it does |
| --- | --- |
| [Standalone causal core](src/causal/index.mjs) | Validate story graphs, apply decisions, compare branches and record causal events |
| [TypeScript API](src/causal/index.d.mts) | Type declarations for consumers |
| [Working example](examples/causal-standalone.mjs) | Offline counterfactual branch comparison |
| [Core tests](tests/causal-core.test.mjs) | Structural, replay, privacy-of-future and branch checks |
| [Developer guide](docs/CAUSAL_CORE.md) | API usage, boundaries and research roadmap |

The reusable core is a small independent implementation of engineering ideas explored in the wider project. The private production application and artistic materials remain unpublished.

## Earlier public research

The existing [experimental director](src/lib/director) contains an earlier deterministic screen runtime (mind.ts), a separate algorithmic experiment (direct.ts), an authored film example (codexFilm.ts), symbolic/chart routines and selected tests. These are **not** the current private Director. The public mind.ts does not call a live AI model. The [React screen](src/components/house.tsx) requires its original host application.

~~~sh
npm test
npm run demo
~~~

See [architecture and boundaries](docs/ARCHITECTURE.md).

## Why this matters

The long-term goal is to turn a desire into a dramatic question, physical decisions, consequences, and evidence-informed next scenes. Open-source research focuses on reproducible counterfactual tests of causal continuity in interactive and AI-assisted stories. Integration with live AI, independent tests of semantic causality and demonstrated third-party utility are future work.

Contributions in reachability, state invariants, counterfactual tests and trace transparency are welcome. See [contributing](CONTRIBUTING.md) and [security](SECURITY.md).

## Real project history

THE COLLECTOR development predates this public GitHub repository. The separate private project contains migration files dated from August 2026, with substantial later work in November 2026. The **public repository was created 16 November 2026** to expose selected research methods. This creation date is not the start of the underlying project.

All public files use the [MIT license](LICENSE). The separate private application and its proprietary creative material retain their existing rights. Maintainer: [akonoplitskayaa-design](https://github.com/akonoplitskayaa-design).
