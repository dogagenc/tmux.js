import { expect, layer } from "@effect/vitest";
import { Array as Arr, Effect } from "effect";
import { TmuxCommandError } from "../../src/Errors";
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

		it.effect("nextWindow moves to the next window", () =>
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
				yield* tmux.newWindow(undefined, { targetWindow: "it" });
				const before = yield* activeIndex();
				yield* tmux.nextWindow({ targetSession: "it" });
				expect(yield* activeIndex()).not.toBe(before);
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

		it.effect("nextWindow -a errors when no window has an alert", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.nextWindow({ alert: true, targetSession: "it" }),
				);
				expect(error).toBeInstanceOf(TmuxCommandError);
				expect((error as TmuxCommandError).stderr).toContain("no next window");
			}),
		);

		it.effect("previousWindow moves the active window back one index", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const activeIndex = () =>
					tmux
						.displayMessage("#{window_index}", {
							print: true,
							targetPane: "it",
						})
						.pipe(Effect.map(Number));
				const baseline = yield* tmux.listWindows({ targetSession: "it" });
				yield* tmux.newWindow(undefined, { targetWindow: "it" });
				const before = yield* activeIndex();
				yield* tmux.previousWindow({ targetSession: "it" });
				expect(yield* activeIndex()).toBe(before - 1);
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

		it.effect("previousWindow -a errors when no window has an alert", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.previousWindow({ alert: true, targetSession: "it" }),
				);
				expect(error).toBeInstanceOf(TmuxCommandError);
				expect((error as TmuxCommandError).stderr).toContain(
					"no previous window",
				);
			}),
		);

		it.effect("next-layout changes the window layout", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const pane = yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
					print: true,
					format: "#{pane_id}",
				});
				const layout = () =>
					tmux.displayMessage("#{window_layout}", {
						targetPane: "it",
						print: true,
					});
				const before = yield* layout();
				yield* tmux.nextLayout({ targetWindow: "it" });
				const after = yield* layout();
				expect(after).not.toBe(before);
				yield* tmux.killPane({ targetPane: pane });
			}),
		);

		it.effect("previous-layout changes the window layout", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const pane = yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
					print: true,
					format: "#{pane_id}",
				});
				const layout = () =>
					tmux.displayMessage("#{window_layout}", {
						targetPane: "it",
						print: true,
					});
				const before = yield* layout();
				yield* tmux.previousLayout({ targetWindow: "it" });
				const after = yield* layout();
				expect(after).not.toBe(before);
				yield* tmux.killPane({ targetPane: pane });
			}),
		);

		it.effect("link-window -a links one index after dst-window", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "asrc",
				});
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "adst",
				});
				yield* tmux.newWindow(undefined, {
					detached: true,
					targetWindow: "adst",
				});
				const src = yield* tmux
					.listWindows({ targetSession: "asrc" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				const dst = yield* tmux
					.listWindows({ targetSession: "adst" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				yield* tmux.linkWindow({
					after: true,
					detached: true,
					sourceWindow: "asrc",
					targetWindow: `adst:${dst.window_index}`,
				});
				const windows = yield* tmux.listWindows({ targetSession: "adst" });
				const linked = yield* Effect.fromOption(
					Arr.findFirst(windows, (w) => w.window_id === src.window_id),
				);
				expect(linked.window_index).toBe(dst.window_index + 1);
				yield* tmux.killSession({ targetSession: "asrc" });
				yield* tmux.killSession({ targetSession: "adst" });
			}),
		);

		it.effect("link-window -b links one index before dst-window", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "bsrc",
				});
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "bdst",
				});
				const src = yield* tmux
					.listWindows({ targetSession: "bsrc" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				const dst = yield* tmux
					.listWindows({ targetSession: "bdst" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				yield* tmux.linkWindow({
					before: true,
					detached: true,
					sourceWindow: "bsrc",
					targetWindow: `bdst:${dst.window_index}`,
				});
				const windows = yield* tmux.listWindows({ targetSession: "bdst" });
				const linked = yield* Effect.fromOption(
					Arr.findFirst(windows, (w) => w.window_id === src.window_id),
				);
				expect(linked.window_index).toBe(dst.window_index);
				yield* tmux.killSession({ targetSession: "bsrc" });
				yield* tmux.killSession({ targetSession: "bdst" });
			}),
		);

		it.effect("link-window -d leaves the previously active window active", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "dsrc",
				});
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "ddst",
				});
				const dst = yield* tmux
					.listWindows({ targetSession: "ddst" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				expect(dst.window_active).toBe(true);
				yield* tmux.linkWindow({
					after: true,
					detached: true,
					sourceWindow: "dsrc",
					targetWindow: `ddst:${dst.window_index}`,
				});
				const active = yield* tmux
					.listWindows({ targetSession: "ddst" })
					.pipe(
						Effect.flatMap((ws) =>
							Effect.fromOption(Arr.findFirst(ws, (w) => w.window_active)),
						),
					);
				expect(active.window_id).toBe(dst.window_id);
				yield* tmux.killSession({ targetSession: "dsrc" });
				yield* tmux.killSession({ targetSession: "ddst" });
			}),
		);

		it.effect("link-window -k replaces an occupied index", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "ksrc",
				});
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "kdst",
				});
				const src = yield* tmux
					.listWindows({ targetSession: "ksrc" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				const dst = yield* tmux
					.listWindows({ targetSession: "kdst" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				yield* tmux.linkWindow({
					destroyExisting: true,
					detached: true,
					sourceWindow: "ksrc",
					targetWindow: `kdst:${dst.window_index}`,
				});
				const atIndex = yield* tmux
					.listWindows({ targetSession: "kdst" })
					.pipe(
						Effect.flatMap((ws) =>
							Effect.fromOption(
								Arr.findFirst(ws, (w) => w.window_index === dst.window_index),
							),
						),
					);
				expect(atIndex.window_id).not.toBe(dst.window_id);
				expect(atIndex.window_id).toBe(src.window_id);
				yield* tmux.killSession({ targetSession: "ksrc" });
				yield* tmux.killSession({ targetSession: "kdst" });
			}),
		);

		it.effect("link-window onto an occupied index without -k errors", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "esrc",
				});
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "edst",
				});
				const dst = yield* tmux
					.listWindows({ targetSession: "edst" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				const error = yield* Effect.flip(
					tmux.linkWindow({
						detached: true,
						sourceWindow: "esrc",
						targetWindow: `edst:${dst.window_index}`,
					}),
				);
				expect(error).toBeInstanceOf(TmuxCommandError);
				expect((error as TmuxCommandError).stderr).toContain("index in use");
				const atIndex = yield* tmux
					.listWindows({ targetSession: "edst" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				expect(atIndex.window_id).toBe(dst.window_id);
				yield* tmux.killSession({ targetSession: "esrc" });
				yield* tmux.killSession({ targetSession: "edst" });
			}),
		);

		it.effect("move-window -s/-t moves src to the requested index", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "msrc",
				});
				yield* tmux.newWindow(undefined, {
					detached: true,
					targetWindow: "msrc",
				});
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "mdst",
				});
				const src = yield* tmux
					.listWindows({ targetSession: "msrc" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				yield* tmux.moveWindow({
					detached: true,
					sourceWindow: src.window_id,
					targetWindow: "mdst:5",
				});
				const dstWindows = yield* tmux.listWindows({ targetSession: "mdst" });
				const moved = yield* Effect.fromOption(
					Arr.findFirst(dstWindows, (w) => w.window_id === src.window_id),
				);
				expect(moved.window_index).toBe(5);
				const srcWindows = yield* tmux.listWindows({ targetSession: "msrc" });
				expect(srcWindows.some((w) => w.window_id === src.window_id)).toBe(
					false,
				);
				yield* tmux.killSession({ targetSession: "msrc" });
				yield* tmux.killSession({ targetSession: "mdst" });
			}),
		);

		it.effect("move-window -a moves one index after dst-window", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "masrc",
				});
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "madst",
				});
				const src = yield* tmux
					.listWindows({ targetSession: "masrc" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				const dst = yield* tmux
					.listWindows({ targetSession: "madst" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				yield* tmux.moveWindow({
					after: true,
					detached: true,
					sourceWindow: "masrc",
					targetWindow: `madst:${dst.window_index}`,
				});
				const windows = yield* tmux.listWindows({ targetSession: "madst" });
				const moved = yield* Effect.fromOption(
					Arr.findFirst(windows, (w) => w.window_id === src.window_id),
				);
				expect(moved.window_index).toBe(dst.window_index + 1);
				yield* tmux.killSession({ targetSession: "madst" });
			}),
		);

		it.effect("move-window -b moves one index before dst-window", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "mbsrc",
				});
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "mbdst",
				});
				const src = yield* tmux
					.listWindows({ targetSession: "mbsrc" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				const dst = yield* tmux
					.listWindows({ targetSession: "mbdst" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				yield* tmux.moveWindow({
					before: true,
					detached: true,
					sourceWindow: "mbsrc",
					targetWindow: `mbdst:${dst.window_index}`,
				});
				const windows = yield* tmux.listWindows({ targetSession: "mbdst" });
				const moved = yield* Effect.fromOption(
					Arr.findFirst(windows, (w) => w.window_id === src.window_id),
				);
				expect(moved.window_index).toBe(dst.window_index);
				yield* tmux.killSession({ targetSession: "mbdst" });
			}),
		);

		it.effect("move-window -d leaves the previously active window active", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "mdsrc",
				});
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "mddst",
				});
				const dst = yield* tmux
					.listWindows({ targetSession: "mddst" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				expect(dst.window_active).toBe(true);
				yield* tmux.moveWindow({
					after: true,
					detached: true,
					sourceWindow: "mdsrc",
					targetWindow: `mddst:${dst.window_index}`,
				});
				const active = yield* tmux
					.listWindows({ targetSession: "mddst" })
					.pipe(
						Effect.flatMap((ws) =>
							Effect.fromOption(Arr.findFirst(ws, (w) => w.window_active)),
						),
					);
				expect(active.window_id).toBe(dst.window_id);
				yield* tmux.killSession({ targetSession: "mddst" });
			}),
		);

		it.effect("move-window -k replaces an occupied index", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "mksrc",
				});
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "mkdst",
				});
				const src = yield* tmux
					.listWindows({ targetSession: "mksrc" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				const dst = yield* tmux
					.listWindows({ targetSession: "mkdst" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				yield* tmux.moveWindow({
					destroyExisting: true,
					detached: true,
					sourceWindow: "mksrc",
					targetWindow: `mkdst:${dst.window_index}`,
				});
				const atIndex = yield* tmux
					.listWindows({ targetSession: "mkdst" })
					.pipe(
						Effect.flatMap((ws) =>
							Effect.fromOption(
								Arr.findFirst(ws, (w) => w.window_index === dst.window_index),
							),
						),
					);
				expect(atIndex.window_id).not.toBe(dst.window_id);
				expect(atIndex.window_id).toBe(src.window_id);
				yield* tmux.killSession({ targetSession: "mkdst" });
			}),
		);

		it.effect("move-window onto an occupied index without -k errors", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "mesrc",
				});
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "medst",
				});
				const dst = yield* tmux
					.listWindows({ targetSession: "medst" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				const error = yield* Effect.flip(
					tmux.moveWindow({
						detached: true,
						sourceWindow: "mesrc",
						targetWindow: `medst:${dst.window_index}`,
					}),
				);
				expect(error).toBeInstanceOf(TmuxCommandError);
				expect((error as TmuxCommandError).stderr).toContain("index in use");
				yield* tmux.killSession({ targetSession: "mesrc" });
				yield* tmux.killSession({ targetSession: "medst" });
			}),
		);

		it.effect("move-window -r renumbers windows contiguously", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.newSession(undefined, {
					detached: true,
					sessionName: "mrsess",
				});
				const baseWindow = yield* tmux
					.listWindows({ targetSession: "mrsess" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				const base = baseWindow.window_index;
				// create a window far from base so a gap persists even when
				// renumber-windows auto-closes gaps on window close
				yield* tmux.newWindow(undefined, {
					detached: true,
					targetWindow: `mrsess:${base + 5}`,
				});
				const gapped = yield* tmux.listWindows({ targetSession: "mrsess" });
				expect(gapped.map((w) => w.window_index)).not.toEqual(
					gapped.map((_, i) => base + i),
				);
				yield* tmux.moveWindow({ renumber: true, sourceWindow: "mrsess" });
				const after = yield* tmux.listWindows({ targetSession: "mrsess" });
				expect(after.map((w) => w.window_index)).toEqual(
					after.map((_, i) => base + i),
				);
				yield* tmux.killSession({ targetSession: "mrsess" });
			}),
		);
	});
});
