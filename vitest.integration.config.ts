import { defineConfig } from "vitest/config";

// Integration suite: spawns a real, isolated tmux server per test. Opt-in and
// slower; assumes tmux is on PATH and fails loudly (TmuxExecutableNotFound)
// if it is absent.
export default defineConfig({
	test: {
		include: ["tests/integration/**/*.test.ts"],
		// Run files serially: each spawns a real tmux server, and parallel load
		// occasionally makes a tmux command return empty stdout (flaky assertions).
		fileParallelism: false,
		testTimeout: 15_000,
		hookTimeout: 15_000,
	},
});
