import { NodeFileSystem } from "@effect/platform-node";
import { expect, layer } from "@effect/vitest";
import { Effect } from "effect";
import { FileSystem } from "effect/FileSystem";
import { TmuxClient } from "../../src/exports/effect";
import { SessionFixture, TmuxServer } from "./util";

layer(TmuxServer)("buffer (integration)", (it) => {
	it.layer(SessionFixture)("with a baseline session", (it) => {
		it.effect("setBuffer then showBuffer round-trips", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.setBuffer("x", { bufferName: "probe" });
				const out = yield* tmux.showBuffer({ bufferName: "probe" });
				expect(out).toBe("x");
			}),
		);

		it.effect("setBuffer -a appends to an existing buffer", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.setBuffer("x", { bufferName: "acc" });
				yield* tmux.setBuffer("y", { bufferName: "acc", append: true });
				expect(yield* tmux.showBuffer({ bufferName: "acc" })).toBe("xy");
			}),
		);

		it.effect("setBuffer -n renames a buffer, keeping its content", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.setBuffer("keep", { bufferName: "before" });
				yield* tmux.setBuffer(undefined, {
					bufferName: "before",
					newBufferName: "after",
				});
				expect(yield* tmux.showBuffer({ bufferName: "after" })).toBe("keep");
			}),
		);

		it.effect("loadBuffer reads a file into a named buffer", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const fs = yield* FileSystem;
				const file = yield* fs.makeTempFile();
				yield* fs.writeFileString(file, "loaded from file");
				yield* tmux.loadBuffer(file, { bufferName: "mybuf" });
				expect(yield* tmux.showBuffer({ bufferName: "mybuf" })).toBe(
					"loaded from file",
				);
			}).pipe(Effect.provide(NodeFileSystem.layer)),
		);

		it.effect("saveBuffer('-', { bufferName }) prints buffer to stdout", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.setBuffer("printed", { bufferName: "out" });
				expect(yield* tmux.saveBuffer("-", { bufferName: "out" })).toBe(
					"printed",
				);
			}),
		);

		it.effect("saveBuffer writes a buffer to a file, resolving ''", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const fs = yield* FileSystem;
				const file = yield* fs.makeTempFile();
				yield* tmux.setBuffer("saved", { bufferName: "tofile" });
				expect(yield* tmux.saveBuffer(file, { bufferName: "tofile" })).toBe("");
				expect(yield* fs.readFileString(file)).toBe("saved");
			}).pipe(Effect.provide(NodeFileSystem.layer)),
		);

		it.effect("saveBuffer -a appends to the file, doubling contents", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const fs = yield* FileSystem;
				const file = yield* fs.makeTempFile();
				yield* tmux.setBuffer("ab", { bufferName: "grow" });
				yield* tmux.saveBuffer(file, { bufferName: "grow" });
				yield* tmux.saveBuffer(file, { bufferName: "grow", append: true });
				expect(yield* fs.readFileString(file)).toBe("abab");
			}).pipe(Effect.provide(NodeFileSystem.layer)),
		);

		it.effect("deleteBuffer({ bufferName }) removes the buffer", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.setBuffer("bye", { bufferName: "doomed" });
				yield* tmux.deleteBuffer({ bufferName: "doomed" });
				const error = yield* Effect.flip(
					tmux.showBuffer({ bufferName: "doomed" }),
				);
				expect(error).toBeDefined();
			}),
		);

		it.effect("deleteBuffer() deletes only the top auto-named buffer", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.setBuffer("named", { bufferName: "survivor" });
				yield* tmux.setBuffer("auto");
				expect(yield* tmux.showBuffer()).toBe("auto");
				yield* tmux.deleteBuffer();
				const gone = yield* Effect.flip(tmux.showBuffer());
				expect(gone).toBeDefined();
				expect(yield* tmux.showBuffer({ bufferName: "survivor" })).toBe(
					"named",
				);
			}),
		);

		// Real timer, not Effect.sleep: it.effect's TestClock never advances
		// virtual time, and we must wait for tmux to render the pasted input.
		const settle = () =>
			Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 300)));

		// Pane running bare `cat` echoes pasted bytes verbatim, so the capture is
		// shell-config independent.
		const catPane = Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			return yield* tmux.splitWindow("cat", {
				targetPane: "it",
				detached: true,
				print: true,
				format: "#{pane_id}",
			});
		});

		it.effect("pasteBuffer -b/-t inserts the named buffer into the pane", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const paneId = yield* catPane;
				yield* tmux.setBuffer("hello", { bufferName: "greet" });
				yield* tmux.pasteBuffer({ bufferName: "greet", targetPane: paneId });
				yield* settle();
				const text = yield* tmux.capturePane({
					print: true,
					targetPane: paneId,
				});
				expect(text).toContain("hello");
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);

		it.effect("pasteBuffer -s replaces LF with the separator", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const paneId = yield* catPane;
				yield* tmux.setBuffer("red\ngreen", { bufferName: "sep" });
				yield* tmux.pasteBuffer({
					bufferName: "sep",
					separator: "@",
					targetPane: paneId,
				});
				yield* settle();
				const text = yield* tmux.capturePane({
					print: true,
					targetPane: paneId,
				});
				expect(text).toContain("red@green");
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);

		it.effect(
			"pasteBuffer -r keeps the LF verbatim instead of replacing it",
			() =>
				Effect.gen(function* () {
					const tmux = yield* TmuxClient;
					const paneId = yield* catPane;
					yield* tmux.setBuffer("red\ngreen", { bufferName: "raw" });
					yield* tmux.pasteBuffer({
						bufferName: "raw",
						raw: true,
						targetPane: paneId,
					});
					yield* settle();
					const text = yield* tmux.capturePane({
						print: true,
						targetPane: paneId,
					});
					expect(text).toContain("red\ngreen");
					expect(text).not.toContain("red@green");
					yield* tmux.killPane({ killOthers: true, targetPane: "it" });
				}),
		);

		it.effect("pasteBuffer -d deletes the buffer after pasting", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const paneId = yield* catPane;
				yield* tmux.setBuffer("bye", { bufferName: "consumed" });
				yield* tmux.pasteBuffer({
					bufferName: "consumed",
					delete: true,
					targetPane: paneId,
				});
				const error = yield* Effect.flip(
					tmux.showBuffer({ bufferName: "consumed" }),
				);
				expect(error).toBeDefined();
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);
	});
});
