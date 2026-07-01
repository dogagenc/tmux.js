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

describe("TmuxClient.deleteBuffer", () => {
	it.effect("resolves an empty string on success", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.deleteBuffer({ bufferName: "cap" })).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("deleteBuffer() emits delete-buffer", () =>
		Effect.gen(function* () {
			expect(yield* captureArgs((tmux) => tmux.deleteBuffer())).toEqual([
				"delete-buffer",
			]);
		}),
	);

	it.effect("deleteBuffer({ bufferName }) emits -b", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) => tmux.deleteBuffer({ bufferName: "cap" })),
			).toEqual(["delete-buffer", "-b", "cap"]);
		}),
	);

	it.effect("deleteBuffer({ bufferName: undefined }) omits -b", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.deleteBuffer({ bufferName: undefined }),
				),
			).toEqual(["delete-buffer"]);
		}),
	);
});

describe("options validation (deleteBuffer)", () => {
	it.effect("rejects an empty buffer name before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.deleteBuffer({ bufferName: "" } as never),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
