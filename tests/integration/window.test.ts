import { expect, layer } from "@effect/vitest";
import { Array as Arr, Effect } from "effect";
import { TmuxClient } from "../../src/exports/effect";
import { SessionFixture, TmuxServer } from "./util";

layer(TmuxServer)("window (integration)", (it) => {
	it.layer(SessionFixture)("with a baseline session", (it) => {
		it.effect("decodes the fixture window", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const first = yield* tmux
					.listWindows({ targetSession: "it" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				expect(first.window_id).toMatch(/^@/);
				expect(Number.isInteger(first.window_index)).toBe(true);
				expect(typeof first.window_active).toBe("boolean");
			}),
		);

		it.effect("creates a second window", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const before = yield* tmux.listWindows({ targetSession: "it" });
				yield* tmux.newWindow(undefined, {
					targetWindow: "it",
					detached: true,
				});
				const after = yield* tmux.listWindows({ targetSession: "it" });
				expect(after.length).toBe(before.length + 1);
				for (const w of after) expect(w.window_id).toMatch(/^@/);
				// restore the baseline so later tests start from one window
				const extra = yield* Effect.fromOption(
					Arr.findFirst(
						after,
						(w) => !before.some((b) => b.window_id === w.window_id),
					),
				);
				yield* tmux.killWindow({ targetWindow: extra.window_id });
			}),
		);

		it.effect("kills a window it opened", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const before = yield* tmux.listWindows({ targetSession: "it" });
				expect(before.length).toBe(1);
				yield* tmux.newWindow(undefined, {
					targetWindow: "it",
					detached: true,
				});
				const opened = yield* tmux.listWindows({ targetSession: "it" });
				expect(opened.length).toBe(2);
				const created = yield* Effect.fromOption(
					Arr.findFirst(
						opened,
						(w) => !before.some((b) => b.window_id === w.window_id),
					),
				);
				yield* tmux.killWindow({ targetWindow: created.window_id });
				const after = yield* tmux.listWindows({ targetSession: "it" });
				expect(after.length).toBe(1);
			}),
		);

		it.effect("renames a window", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const before = yield* tmux
					.listWindows({ targetSession: "it" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				yield* tmux.renameWindow("renamed", { targetWindow: "it" });
				const after = yield* tmux
					.listWindows({ targetSession: "it" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				expect(after.window_name).toBe("renamed");
				expect(after.window_name).not.toBe(before.window_name);
				// restore the baseline name for later tests
				yield* tmux.renameWindow(before.window_name, {
					targetWindow: "it",
				});
			}),
		);

		it.effect("listWindows -f filters by tmux expression", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.newWindow(undefined, {
					targetWindow: "it",
					detached: true,
					windowName: "keep",
				});
				const filtered = yield* tmux.listWindows({
					targetSession: "it",
					filter: "#{==:#{window_name},keep}",
				});
				expect(filtered.map((w) => w.window_name)).toEqual(["keep"]);
				const created = yield* Effect.fromOption(
					Arr.findFirst(filtered, (w) => w.window_name === "keep"),
				);
				yield* tmux.killWindow({ targetWindow: created.window_id });
			}),
		);

		it.effect("lastWindow flips back to the previously selected window", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const activeIndex = () =>
					tmux.listWindows({ targetSession: "it" }).pipe(
						Effect.flatMap((ws) =>
							Effect.fromOption(Arr.findFirst(ws, (w) => w.window_active)),
						),
						Effect.map((w) => w.window_index),
					);
				const baseline = yield* tmux.listWindows({ targetSession: "it" });
				const a = yield* tmux
					.newWindow(undefined, { targetWindow: "it" })
					.pipe(Effect.andThen(activeIndex()));
				const b = yield* tmux
					.newWindow(undefined, { targetWindow: "it" })
					.pipe(Effect.andThen(activeIndex()));
				expect(b).not.toBe(a);
				yield* tmux.lastWindow({ targetSession: "it" });
				expect(yield* activeIndex()).toBe(a);
				const extras = yield* tmux
					.listWindows({ targetSession: "it" })
					.pipe(
						Effect.map((ws) =>
							ws.filter(
								(w) => !baseline.some((b) => b.window_id === w.window_id),
							),
						),
					);
				for (const w of extras)
					yield* tmux.killWindow({ targetWindow: w.window_id });
			}),
		);
	});
});
