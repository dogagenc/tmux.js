# tmux.js

TypeScript-first programmatic tmux for Node.js and Bun.

This package is an early-stage wrapper around the `tmux` CLI. Commands will be added as the project needs them, rather than trying to mirror all of tmux up front.

## Goals

- Run tmux commands from Node.js and Bun
- Provide a TypeScript API for common tmux workflows
- Support both plain TypeScript and Effect usage
- Keep behavior close to tmux itself
- Add API surface incrementally

## Installation

```sh
npm install @dogagenc/tmux.js
```

Requires a `tmux` binary of version 3.4 or newer — found on `PATH` by default, or
point at any binary with `new TmuxClient({ executable: "/path/to/tmux" })`. Tested
against tmux 3.4 through 3.6.

## Entry points

The package ships ESM-only with three entry points:

- `@dogagenc/tmux.js` — standalone Promise-based API for Node-compatible runtimes. No Effect knowledge required.
- `@dogagenc/tmux.js/bun` — standalone Promise-based API backed by Bun platform services.
- `@dogagenc/tmux.js/effect` — Effect-native API (`TmuxClient` service + base layer + tagged errors) for Effect users.

All entry points expose the same tagged error classes (`TmuxExecutableNotFound`, `TmuxProcessError`, `TmuxServerNotRunning`, `TmuxTargetNotFound`, `TmuxCommandError`, `TmuxParseError`, `TmuxCommandOptionsError`, `TmuxClientConfigError`). Importing any entry point spawns nothing; tmux only runs when a command is called.

## Usage

### Standalone (Promise API)

```ts
import { TmuxClient, TmuxServerNotRunning } from "@dogagenc/tmux.js";

const tmux = new TmuxClient();

// Resolves with decoded sessions; rejects with TmuxServerNotRunning if no server.
const sessions = await tmux.listSessions();

try {
	const windows = await tmux.listWindows();
	console.log(windows);
} catch (error) {
	// Expected tmux/config failures reject with tagged errors.
	if (error instanceof TmuxServerNotRunning) {
		console.error("no tmux server running");
	}
}
```

### Effect

```ts
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { TmuxClient } from "@dogagenc/tmux.js/effect";

const program = Effect.gen(function* () {
	const tmux = yield* TmuxClient;
	return yield* tmux.listSessions();
}).pipe(
	Effect.provide(TmuxClient.layer().pipe(Layer.provide(NodeServices.layer))),
);

Effect.runPromise(program).then(console.log);
```

`TmuxClient.layer()` requires `ChildProcessSpawner`; provide `NodeServices.layer` for Node/Deno, `BunServices.layer` for Bun, or a fake spawner in tests. Pass `{ executable, socketName, socketPath }` to target a custom tmux binary/socket.

## Development

```sh
pnpm install
pnpm test
pnpm check
```

### Effect setup

This project uses [Effect](https://effect.website) v4 as a language. The pieces are already installed; no extra setup is needed:

- `effect` — core APIs (`Context`, `Effect`, `Layer`, `Schema`) and `effect/unstable/process` for child processes.
- `@effect/platform-node` / `@effect/platform-bun` — platform layers that provide `ChildProcessSpawner` for Promise entry points and Effect users.
- `@effect/vitest` — `it.effect` test runner.
- `@effect/language-service` — Effect-specific diagnostics (wired in `tsconfig.json`).

Service pattern used here (see `src/internal/Client.ts`): a `Context.Service` with a dependency-requiring `layer(config?)` (requires `ChildProcessSpawner`, so tests and non-Node platforms can provide their own services). Errors stay in the typed channel as a `Schema.TaggedError`; nothing runs at import time.

Validation commands:

```sh
pnpm typecheck   # tsc --noEmit (src only)
pnpm diagnostics # Effect language-service diagnostics
pnpm test        # vitest
pnpm check       # Biome lint + format
```


## Command coverage

46 tmux commands are wrapped, each with typed options and results — see the
[API docs](https://dogagenc.github.io/tmux.js/) for per-command details:

`breakPane` `capturePane` `clearHistory` `deleteBuffer` `displayMessage`
`hasSession` `joinPane` `killPane` `killServer` `killSession` `killWindow`
`lastPane` `lastWindow` `linkWindow` `listPanes` `listSessions` `listWindows`
`loadBuffer` `movePane` `moveWindow` `newSession` `newWindow` `nextLayout`
`nextWindow` `pasteBuffer` `pipePane` `previousLayout` `previousWindow`
`renameSession` `renameWindow` `resizePane` `resizeWindow` `respawnPane`
`respawnWindow` `rotateWindow` `saveBuffer` `selectLayout` `selectPane`
`selectWindow` `sendKeys` `setBuffer` `showBuffer` `splitWindow` `swapPane`
`swapWindow` `unlinkWindow`

More are added incrementally.

## License

ISC
