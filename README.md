# THE COLLECTOR

**Experimental toolkit for causal, choice-driven interactive narratives.**

THE COLLECTOR explores how a personal input can lead to a dramatic question, a physical choice, a changed fictional world, and an evidence-informed next scene. This repository is a **public research prototype** for developers interested in adaptive storytelling, branching narrative mechanics, and adversarial evaluation of AI-assisted narrative systems.

> **Scope:** This public repository contains an earlier experimental screen and Director implementation. It is **not** the latest private Codex implementation, a finished app, or a released AI Director. The main production-oriented project remains private. No live AI model is invoked by the public `mind.ts` runtime.

## What is here?

| Path | Purpose |
| --- | --- |
| `src/components/house.tsx` | Screen used by the earlier public prototype; depends on its host React application |
| `src/lib/director/mind.ts` | Deterministic choice loop currently called by the screen |
| `src/lib/director/chart.ts` | Birth-chart-derived input using `astronomy-engine` and project-specific approximations |
| `src/lib/director/astrology.ts` | Approximate symbolic calculations and transit/dasha helpers |
| `src/lib/director/desire.ts` | Experimental rule-based desire classification |
| `src/lib/director/principles.ts` | Small dramatic-principle reference catalogue |
| `src/lib/director/quality.ts` | Structural scene and philosophy-contract checks |
| `src/lib/director/direct.ts` | Separate deterministic Director experiment; not the screen runtime |
| `src/lib/director/codexFilm.ts` | An authored example film, retained for reference; not the screen runtime |
| `src/lib/director/*.test.ts` | Public tests of selected branching and contract properties |

## Why this might be useful

The public code provides inspectable examples of:

1. Keeping private interpretation separate from public scene text.
2. Giving physical choices distinct consequences and recorded evidence.
3. Checking branch structure and testing how story state changes after choices.
4. Comparing outcomes for different input profiles and adversarial cases.

These are **research examples**, not claims that the current prototype has proven general personalization, semantic validity of symbolic readings, or literary excellence.

## Run the public tests

Prerequisite: **Node.js 24** and npm.

```sh
npm install
npm test
npm run demo
```

`npm run demo` prints an offline first scene, follows one synthetic choice, and shows the recorded consequence and revised hypothesis weights. It is an illustrative deterministic example, not a live AI-generated story. The React screen is a component from a separate host application and is not a standalone runnable web app here. The public GitHub Actions workflow attempts the tests and demo; check its latest result before treating them as verified.

## Architecture and limitations

See [Architecture and evaluation](docs/ARCHITECTURE.md) for the real dependency paths, current limitations, and the difference between deterministic tests and proof of artistic quality.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) for focused ways to help with counterfactual stability, causal traces, branching behavior, and documentation. Please do not open issues containing personal birth records, private desires, passwords, or API keys.

## Status and licensing

This is an early-stage, publicly inspectable research prototype. It has no demonstrated broad adoption or stable API. Public files in this repository are published under the [MIT License](LICENSE). The separate private production-oriented repository is not covered by this license. This public copy has no demonstrated broad adoption or stable API.

Maintainer: [akonoplitskayaa-design](https://github.com/akonoplitskayaa-design).
