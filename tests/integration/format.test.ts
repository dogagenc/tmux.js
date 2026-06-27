import { expect, layer } from "@effect/vitest";
import { Effect } from "effect";
import { TmuxClient } from "../../src/exports/effect";
import { SessionFixture, TmuxServer } from "./util";

layer(TmuxServer)("format (integration)", (it) => {
	it.layer(SessionFixture)("with a baseline session", (it) => {
		it.effect("displayMessage expands a format", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const name = yield* tmux.displayMessage("#{session_name}", {
					print: true,
					targetPane: "it",
				});
				expect(name).toBe("it");
			}),
		);
	});
});
