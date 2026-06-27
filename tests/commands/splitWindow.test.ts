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

describe("TmuxClient.splitWindow", () => {
	it.effect("resolves to an empty string without -P", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.splitWindow(undefined, { detached: true })).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("strips the trailing newline from -P output", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.splitWindow(undefined, { print: true })).toBe("0:1.2");
		}).pipe(Effect.provide(tmuxFrom({ ...empty, stdout: "0:1.2\n" }))),
	);

	it.effect("emits boolean and valued flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.splitWindow(undefined, {
						horizontal: true,
						detached: true,
						size: "30%",
						targetPane: "work",
					}),
				),
			).toEqual(["split-window", "-d", "-h", "-l", "30%", "-t", "work"]);
		}),
	);

	it.effect("emits the shell-command positional after flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) => tmux.splitWindow("htop", { zoom: true })),
			).toEqual(["split-window", "-Z", "htop"]);
		}),
	);
});

describe("argument validation (splitWindow)", () => {
	it.effect("rejects an empty target pane before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.splitWindow(undefined, { targetPane: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
