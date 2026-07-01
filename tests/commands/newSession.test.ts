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

describe("TmuxClient.newSession", () => {
	it.effect("resolves to an empty string without -P", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.newSession(undefined, { detached: true })).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("strips the trailing newline from -P output", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(
				yield* tmux.newSession(undefined, { detached: true, print: true }),
			).toBe("s2:");
		}).pipe(Effect.provide(tmuxFrom({ ...empty, stdout: "s2:\n" }))),
	);

	it.effect("emits boolean and valued flags in struct order", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.newSession(undefined, {
						detached: true,
						noUpdateEnvironment: true,
						print: true,
						startDirectory: "/tmp",
						environment: "FOO=bar",
						format: "#{session_name}",
						windowName: "main",
						sessionName: "work",
						targetSession: "grp",
						width: 200,
						height: "-",
					}),
				),
			).toEqual([
				"new-session",
				"-d",
				"-E",
				"-P",
				"-c",
				"/tmp",
				"-e",
				"FOO=bar",
				"-F",
				"#{session_name}",
				"-n",
				"main",
				"-s",
				"work",
				"-t",
				"grp",
				"-x",
				"200",
				"-y",
				"-",
			]);
		}),
	);

	it.effect("emits the shell-command positional after flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.newSession("htop", { detached: true, sessionName: "mon" }),
				),
			).toEqual(["new-session", "-d", "-s", "mon", "htop"]);
		}),
	);
});

describe("argument validation (newSession)", () => {
	it.effect("rejects an empty session name before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.newSession(undefined, {
						detached: true,
						sessionName: "" as never,
					}),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
