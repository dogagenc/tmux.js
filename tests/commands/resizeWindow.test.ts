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

describe("TmuxClient.resizeWindow", () => {
	it.effect("resolves to an empty string on success", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.resizeWindow(5, { down: true })).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("emits a direction flag with the adjustment positional", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.resizeWindow(5, { down: true, targetWindow: "work:1" }),
				),
			).toEqual(["resize-window", "-D", "-t", "work:1", "5"]);
		}),
	);

	it.effect("emits the smallest/largest and up/left/right flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.resizeWindow(undefined, {
						smallest: true,
						largest: true,
						up: true,
						left: true,
						right: true,
					}),
				),
			).toEqual(["resize-window", "-a", "-A", "-U", "-L", "-R"]);
		}),
	);

	it.effect("emits absolute width and height flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.resizeWindow(undefined, { width: 120, height: 40 }),
				),
			).toEqual(["resize-window", "-x", "120", "-y", "40"]);
		}),
	);
});

describe("argument validation (resizeWindow)", () => {
	it.effect("rejects an empty target window before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.resizeWindow(undefined, { targetWindow: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
