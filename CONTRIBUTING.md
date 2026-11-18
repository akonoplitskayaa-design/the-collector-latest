# Contributing

THE COLLECTOR is an experimental research project. The most useful contributions improve the **reproducibility and honesty** of causal narrative evaluation.

## Good first contributions

- Add counterfactual tests that change one relevant feature and track where the difference propagates.
- Add invariance tests that change an unrelated feature without perturbing the selected directing task.
- Identify cases where generated text sounds different while the causal choice is effectively identical.
- Strengthen assertions for physical, mutually exclusive actions and reachable branch outcomes.
- Improve the documentation of calculation approximations and missing input information.
- Report reproducible errors with a minimal synthetic fixture.

## Local validation

Use Node.js 24 or newer:

```sh
npm install
npm test
```

The public repository is not a complete deployed website. The component `house.tsx` depends on its original host application.

## Review expectations

Open an issue first for architectural changes. For a proposed code change, explain the affected invariant, the failure fixture, what must change, what must remain unchanged, and exactly what the tests do and do not prove.

## Privacy

Use synthetic test profiles. Never include someone else's real birth details, private desires, API keys, access tokens, credentials or private production files.

## Licensing

An explicit open-source license has not yet been selected by the repository owner. Public access alone does not grant broad reuse permission. We can discuss potential contributions, but do not assume that code redistribution is already authorized.
