import { describe, expect, it } from "@effect/vitest";
import * as commands from "../src/commands";
import { TmuxClientConfigError, TmuxServerNotRunning } from "../src/Errors";
import { TmuxClient as PromiseTmuxClient } from "../src/exports/node";
import { makePromiseClient } from "../src/internal/PromiseClient";
import { fakeHandle, spawnerWith } from "./utils";

describe("standalone TmuxClient API", () => {
	it("exposes every command", () => {
		const client = new PromiseTmuxClient();
		for (const command of Object.keys(commands)) {
			expect(typeof client[command as keyof typeof commands]).toBe("function");
		}
	});

	it("exposes every command from the Bun entrypoint when running on Bun", async () => {
		if (!("Bun" in globalThis)) return;

		const { TmuxClient: BunPromiseTmuxClient } = await import(
			"../src/exports/bun"
		);
		const client = new BunPromiseTmuxClient();
		for (const command of Object.keys(commands)) {
			expect(typeof client[command as keyof typeof commands]).toBe("function");
		}
	});

	it("rejects with TmuxClientConfigError when config fails validation", async () => {
		const client = new PromiseTmuxClient({
			socketName: "a",
			socketPath: "b",
		});
		await expect(client.listSessions()).rejects.toBeInstanceOf(
			TmuxClientConfigError,
		);
	});

	it("resolves decoded command output", async () => {
		const Client = makePromiseClient(
			spawnerWith(fakeHandle({ stdout: "ok\n", stderr: "", exitCode: 0 })),
		);
		await expect(
			new Client().displayMessage("ignored", { print: true }),
		).resolves.toBe("ok");
	});

	it("rejects typed tmux failures as their tagged error", async () => {
		const Client = makePromiseClient(
			spawnerWith(
				fakeHandle({
					stdout: "",
					stderr: "no server running on /tmp/tmux-501/default\n",
					exitCode: 1,
				}),
			),
		);
		await expect(new Client().listSessions()).rejects.toBeInstanceOf(
			TmuxServerNotRunning,
		);
	});

	it("rejects unknown config keys", async () => {
		const client = new PromiseTmuxClient({ unknown: "x" } as never);
		await expect(client.listSessions()).rejects.toBeInstanceOf(
			TmuxClientConfigError,
		);
	});
});
