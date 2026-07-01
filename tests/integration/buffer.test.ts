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
	});
});
