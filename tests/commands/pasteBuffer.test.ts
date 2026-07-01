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

describe("TmuxClient.pasteBuffer", () => {
	it.effect("resolves to an empty string", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.pasteBuffer({ targetPane: "it" })).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("emits boolean and valued flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.pasteBuffer({
						delete: true,
						raw: true,
						bracketed: true,
						separator: " ",
						bufferName: "buf",
						targetPane: "sess:1.1",
					}),
				),
			).toEqual([
				"paste-buffer",
				"-d",
				"-r",
				"-p",
				"-s",
				" ",
				"-b",
				"buf",
				"-t",
				"sess:1.1",
			]);
		}),
	);
});

describe("argument validation (pasteBuffer)", () => {
	it.effect("rejects an empty target pane before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.pasteBuffer({ targetPane: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
