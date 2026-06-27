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

describe("TmuxClient.newWindow", () => {
	it.effect("resolves to an empty string without -P", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.newWindow(undefined, { detached: true })).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("strips the trailing newline from -P output", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.newWindow(undefined, { print: true })).toBe("0:2.1");
		}).pipe(Effect.provide(tmuxFrom({ ...empty, stdout: "0:2.1\n" }))),
	);

	it.effect("emits boolean and valued flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.newWindow(undefined, {
						after: true,
						detached: true,
						windowName: "logs",
						targetWindow: "work",
					}),
				),
			).toEqual(["new-window", "-a", "-d", "-n", "logs", "-t", "work"]);
		}),
	);

	it.effect("emits the shell-command positional after flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.newWindow("htop", { windowName: "mon" }),
				),
			).toEqual(["new-window", "-n", "mon", "htop"]);
		}),
	);
});

describe("argument validation (newWindow)", () => {
	it.effect("rejects an empty window name before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.newWindow(undefined, { windowName: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);

	it.effect("rejects after and before together before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.newWindow(undefined, {
						after: true,
						before: true,
					} as never),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
