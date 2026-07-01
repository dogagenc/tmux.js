import { expect, layer } from "@effect/vitest";
import { Array as Arr, Effect } from "effect";
import { TmuxClient } from "../../src/exports/effect";
import { TmuxServer } from "./util";

// Full session lifecycle against real tmux: create, list, rename, kill. Asserts
// stable shape (id prefix, types) and state transitions, never volatile values.
layer(TmuxServer)("session (integration)", (it) => {
	it.effect("create, list, rename, kill", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;

			yield* tmux.newSession(undefined, {
				detached: true,
				sessionName: "alpha",
			});

			const created = yield* tmux
				.listSessions()
				.pipe(Effect.flatMap((s) => Effect.fromOption(Arr.head(s))));
			expect(created.session_id).toMatch(/^\$/);
			expect(typeof created.session_name).toBe("string");
			expect(Number.isInteger(created.session_windows)).toBe(true);

			const before = yield* tmux
				.listSessions()
				.pipe(Effect.map(Arr.map((s) => s.session_name)));
			expect(before).toContain("alpha");

			yield* tmux.renameSession("beta", { targetSession: "alpha" });

			const after = yield* tmux
				.listSessions()
				.pipe(Effect.map(Arr.map((s) => s.session_name)));
			expect(after).toContain("beta");
			expect(after).not.toContain("alpha");

			// Killing the only session exits the server; the layer's killServer
			// teardown then no-ops.
			yield* tmux.killSession({ targetSession: "beta" });
		}),
	);

	it.effect("hasSession reflects existence before and after kill", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;

			// Keep a session alive so killing "probe" does not exit the server,
			// which would make hasSession error instead of returning false.
			yield* tmux.newSession(undefined, {
				detached: true,
				sessionName: "keeper",
			});
			yield* tmux.newSession(undefined, {
				detached: true,
				sessionName: "probe",
			});
			expect(yield* tmux.hasSession({ targetSession: "probe" })).toBe(true);

			yield* tmux.killSession({ targetSession: "probe" });
			expect(yield* tmux.hasSession({ targetSession: "probe" })).toBe(false);
			expect(yield* tmux.hasSession({ targetSession: "keeper" })).toBe(true);
		}),
	);
});
