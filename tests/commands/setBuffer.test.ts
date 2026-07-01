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

describe("TmuxClient.setBuffer", () => {
	it.effect("returns stdout", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.setBuffer("x")).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("setBuffer(data) emits the positional data", () =>
		Effect.gen(function* () {
			expect(yield* captureArgs((tmux) => tmux.setBuffer("x"))).toEqual([
				"set-buffer",
				"x",
			]);
		}),
	);

	it.effect("setBuffer(data, { bufferName }) emits -b before data", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.setBuffer("x", { bufferName: "probe" }),
				),
			).toEqual(["set-buffer", "-b", "probe", "x"]);
		}),
	);

	it.effect(
		"setBuffer(undefined, { newBufferName }) renames without data",
		() =>
			Effect.gen(function* () {
				expect(
					yield* captureArgs((tmux) =>
						tmux.setBuffer(undefined, {
							bufferName: "old",
							newBufferName: "new",
						}),
					),
				).toEqual(["set-buffer", "-b", "old", "-n", "new"]);
			}),
	);

	it.effect("setBuffer(data, { append }) emits -a", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) => tmux.setBuffer("x", { append: true })),
			).toEqual(["set-buffer", "-a", "x"]);
		}),
	);

	it.effect(
		"setBuffer(data, { clipboard, targetClient }) emits -w and -t",
		() =>
			Effect.gen(function* () {
				expect(
					yield* captureArgs((tmux) =>
						tmux.setBuffer("x", { clipboard: true, targetClient: "c0" }),
					),
				).toEqual(["set-buffer", "-w", "-t", "c0", "x"]);
			}),
	);
});

describe("options validation (setBuffer)", () => {
	it.effect("rejects an empty buffer name before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.setBuffer("x", { bufferName: "" } as never),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
