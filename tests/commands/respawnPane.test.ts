import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TmuxCommandOptionsError } from "../../src/Errors";
import { TmuxClient } from "../../src/exports/effect";
import { capturingTmux, tmuxFrom } from "../utils";

const empty = { stdout: "", stderr: "", exitCode: 0 };

const captureArgs = (
	run: (tmux: TmuxClient["Service"]) => Effect.Effect<unknown, unknown>,
) => {
	const harness = capturingTmux(empty);
	return Effect.gen(function* () {
		const tmux = yield* TmuxClient;
		yield* run(tmux);
		return harness.captured.args;
	}).pipe(Effect.provide(harness.layer));
};

describe("TmuxClient.respawnPane", () => {
	it.effect("resolves to an empty string", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.respawnPane(undefined, { kill: true })).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("emits boolean and valued flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.respawnPane(undefined, {
						kill: true,
						startDirectory: "/tmp",
						environment: "FOO=bar",
						targetPane: "sess:1.1",
					}),
				),
			).toEqual([
				"respawn-pane",
				"-k",
				"-c",
				"/tmp",
				"-e",
				"FOO=bar",
				"-t",
				"sess:1.1",
			]);
		}),
	);

	it.effect("emits the shell-command positional after flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) => tmux.respawnPane("htop", { kill: true })),
			).toEqual(["respawn-pane", "-k", "htop"]);
		}),
	);
});

describe("argument validation (respawnPane)", () => {
	it.effect("rejects an empty target pane before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.respawnPane(undefined, { targetPane: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
