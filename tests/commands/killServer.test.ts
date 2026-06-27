import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TmuxClient } from "../../src/exports/effect";
import { capturingTmux, tmuxFrom } from "../utils";

const empty = { stdout: "", stderr: "", exitCode: 0 };

describe("TmuxClient.killServer", () => {
	it.effect("returns stdout", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.killServer()).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("killServer() emits the bare subcommand", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.killServer();
				expect(harness.captured.args).toEqual(["kill-server"]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
