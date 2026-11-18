# Architecture and evaluation

This document describes the **public research copy**, not the private Codex implementation.

## Runtime map

The screen in `src/components/house.tsx` calls `openMind` and `chooseMind` from `src/lib/director/mind.ts`. That module reads a person through `chart.ts`, classifies a desire through `desire.ts`, selects an entry from `principles.ts`, maintains hypotheses and choice evidence, and produces deterministic scenes.

There are two other distinct artifacts in the source tree:

- `direct.ts` is a separate deterministic experimental implementation, **not used by the screen**.
- `codexFilm.ts` is an authored example, **not the generative engine or the screen's current runtime**.

The public copy contains **no live LLM call inside `mind.ts`**. The natal interpretation and scene variants are substantially rule-based or authored.

## The research question

Can a system turn personal inputs and a desire into hypotheses, use physical actions as informative observations, and generate a genuinely different next decision based on what happened?

The intended causal chain is:

```text
input → calculated/symbolic features → candidate hypotheses
      → selected dramatic question → scene with physical choices
      → changed world state + action evidence → revised hypotheses
      → next dramatic question
```

That chain is a **research target**. Tests showing different output text do not prove that the story decision is genuinely caused by a relevant input.

## Limitations and evaluation priorities

1. **Semantic validity:** a legitimate calculated source is not sufficient evidence for an arbitrary interpretation.
2. **Relevance:** changing a factor unrelated to the active hypothesis should not mechanically change the scene.
3. **Sensitivity:** changing a relevant structure should leave an inspectable causal trace, even when the final decision remains stable for good reasons.
4. **Behavioral learning:** an action contradicting a hypothesis must be able to reduce confidence in that interpretation. Ambiguous actions should not be overinterpreted.
5. **Branch validity:** each choice needs an executable, distinct next state; future states must remain hidden until the triggering choice.
6. **Artistic quality:** schema correctness, text diversity, and even structural tests cannot independently establish emotional interest, originality or literary quality.
7. **Data quality:** birth time/place and calculation approximations must be explicit. The `chart.ts` implementation has a limited built-in place map and simplified symbolic mappings.

The public tests in `mind.test.ts` and `direct.test.ts` examine selected structural and branching behavior. A prior external adversarial exercise reported deficiencies on an **earlier private NatalPersonalSynthesis archive**; those results must not be represented as a verdict on this separate public runtime or on a newer private working tree.

## For contributors

Useful independent contributions include reproducible counterfactual fixtures, branch-reachability checks, trace examples showing which exact facts caused a decision, and rigorous distinction between structural and artistic evaluation.

Avoid embedding personal birth data, private wishes, secret API credentials, or private repository code in fixtures.
