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

describe("TmuxClient.resizePane", () => {
	it.effect("resolves to an empty string on success", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.resizePane(5, { down: true })).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("emits a direction flag with the adjustment positional", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.resizePane(5, { down: true, targetPane: "work:1.0" }),
				),
			).toEqual(["resize-pane", "-D", "-t", "work:1.0", "5"]);
		}),
	);

	it.effect("emits the up/left/right and zoom flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.resizePane(undefined, {
						up: true,
						left: true,
						right: true,
						zoom: true,
					}),
				),
			).toEqual(["resize-pane", "-U", "-L", "-R", "-Z"]);
		}),
	);

	it.effect("emits absolute width and height flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.resizePane(undefined, { width: 80, height: "50%" }),
				),
			).toEqual(["resize-pane", "-x", "80", "-y", "50%"]);
		}),
	);
});

describe("argument validation (resizePane)", () => {
	it.effect("rejects an empty target pane before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.resizePane(undefined, { targetPane: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
