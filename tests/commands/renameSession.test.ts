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

describe("TmuxClient.renameSession", () => {
	it.effect("returns stdout", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.renameSession("work")).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("renameSession(newName) emits positional new name", () =>
		Effect.gen(function* () {
			expect(yield* captureArgs((tmux) => tmux.renameSession("work"))).toEqual([
				"rename-session",
				"work",
			]);
		}),
	);

	it.effect(
		"renameSession(newName, { targetSession }) emits -t before new name",
		() =>
			Effect.gen(function* () {
				expect(
					yield* captureArgs((tmux) =>
						tmux.renameSession("work", { targetSession: "main" }),
					),
				).toEqual(["rename-session", "-t", "main", "work"]);
			}),
	);
});

describe("argument validation (renameSession)", () => {
	it.effect("rejects an empty new name before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(tmux.renameSession("" as never));
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
