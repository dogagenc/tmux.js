import { defineConfig } from "vitest/config";

// Integration suite: spawns a real, isolated tmux server per test. Opt-in and
// slower; assumes tmux is on PATH and fails loudly (TmuxExecutableNotFound)
// if it is absent.
export default defineConfig({
	test: {
		include: ["tests/integration/**/*.test.ts"],
		testTimeout: 15_000,
		hookTimeout: 15_000,
	},
});
