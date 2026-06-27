import { configDefaults, defineConfig } from "vitest/config";

// Hermetic unit suite. Integration tests (real tmux) live in tests/integration
// and run via `pnpm test:integration` so this suite stays fast and tmux-free.
export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		exclude: [...configDefaults.exclude, "tests/integration/**"],
	},
});
