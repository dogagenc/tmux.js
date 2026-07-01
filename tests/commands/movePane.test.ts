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

describe("TmuxClient.movePane", () => {
	it.effect("resolves to an empty string on success", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.movePane({ targetPane: "work:2" })).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("emits boolean and valued flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.movePane({
						horizontal: true,
						detached: true,
						size: "50%",
						sourcePane: "work:1.0",
						targetPane: "work:2.0",
					}),
				),
			).toEqual([
				"move-pane",
				"-d",
				"-h",
				"-l",
				"50%",
				"-s",
				"work:1.0",
				"-t",
				"work:2.0",
			]);
		}),
	);

	it.effect("emits before, full, and vertical flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.movePane({ before: true, full: true, vertical: true }),
				),
			).toEqual(["move-pane", "-b", "-f", "-v"]);
		}),
	);
});

describe("argument validation (movePane)", () => {
	it.effect("rejects an empty target pane before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.movePane({ targetPane: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
