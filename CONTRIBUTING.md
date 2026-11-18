# Contributing

THE COLLECTOR public research welcomes reproducible improvements to causal branching and evidence trails.

The standalone library is in [src/causal/index.mjs](src/causal/index.mjs), with TypeScript declarations alongside. The earlier public Director prototype is in src/lib/director.

## Useful contributions

* Counterfactual fixtures that change one relevant state property and trace its consequences.
* Invariance checks where unrelated metadata cannot affect a branch.
* Reachability, cycle and equivalent-outcome detection.
* Transparent causal traces that hide future outcomes from readers.
* Reproducible developer examples and safer adapters for candidate AI-generated story graphs.
* Documentation of earlier symbolic calculations and missing inputs.

## Local checks

Node.js 24+ required.

~~~sh
npm install
npm run test:core
npm run demo:core
npm test
npm run demo
~~~

For substantial changes, open an issue describing the invariant, a minimal synthetic failing test, and exactly what would improve. Passing structural tests does not prove emotional or literary quality.

## Privacy and licensing

Use synthetic people and events. Never post private birth details, desires, credentials, keys, proprietary artistic source or private application code. The public repository is MIT licensed; the private main application is separate.
