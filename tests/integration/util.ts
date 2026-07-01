import { NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { Path } from "effect/Path";
import { TmuxClient } from "../../src/exports/effect";

const socketName = () =>
	`tmuxjs-test-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

// A fresh isolated client per build: a unique `-L` socket, never the user's
// default server, so an in-tmux test run is safe.
const isolatedClient = Layer.unwrap(
	Effect.gen(function* () {
		const path = yield* Path;
		return TmuxClient.layer({
			socketName: socketName(),
			configFile: path.resolve("tests/integration/empty_tmux.conf"),
		});
	}),
).pipe(Layer.provide(NodeServices.layer));

// Kill the whole server on group teardown, whatever the tests left behind
// (0, 1, or many sessions). Runs before the client tears down. tmux leaves a
// harmless, uniquely-named dead socket file behind; removing it would need node
// fs, which this library avoids.
const serverCleanup = Layer.effectDiscard(
	Effect.gen(function* () {
		const tmux = yield* TmuxClient;
		yield* Effect.acquireRelease(Effect.void, () =>
			tmux.killServer().pipe(Effect.ignore),
		);
	}),
);

/**
 * Isolated, throwaway tmux server shared across a test group via
 * `layer(TmuxServer)`. Built once in `beforeAll`, killed once in `afterAll`.
 */
export const TmuxServer = serverCleanup.pipe(
	Layer.provideMerge(isolatedClient),
);

/**
 * Baseline session "it" (one window, one pane) created once for a group via
 * `it.layer(SessionFixture)`, nested under `layer(TmuxServer)`. Teardown is the
 * server's `killServer`, so use at most one fixture per server (the name "it"
 * would otherwise collide).
 */
export const SessionFixture = Layer.effectDiscard(
	Effect.gen(function* () {
		const tmux = yield* TmuxClient;
		yield* tmux.newSession(undefined, { detached: true, sessionName: "it" });
	}),
);
