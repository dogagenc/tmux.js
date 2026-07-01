#!/usr/bin/env node
// Completeness lint (build tooling, not part of the effect suite — hence plain
// node fs is fine here). Every flag token a command can emit must be referenced
// by at least one assertion in that command's argv test. Correctness of the
// token (order/value) stays owned by the hand-written `toEqual` assertions; this
// only fails when a flag was never exercised at all.
//
// Source lint: `TmuxCommand.make` does not expose the flags schema on the built
// method, so we read `TmuxFlag("-x", ...)` tokens from the command source and
// check the matching test file.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const commandsDir = join(root, "src", "commands");
const testsDir = join(root, "tests", "commands");

const stripComments = (s) =>
	s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/([^:])\/\/.*$/gm, "$1");

const tokens = (src) => [
	...new Set(
		[...stripComments(src).matchAll(/TmuxFlag\(\s*"([^"]+)"/g)].map(
			(m) => m[1],
		),
	),
];

let gaps = 0;
for (const file of readdirSync(commandsDir).sort()) {
	if (!file.endsWith(".ts") || file === "index.ts") continue;
	const flags = tokens(readFileSync(join(commandsDir, file), "utf8"));
	if (flags.length === 0) continue;
	const base = file.replace(/\.ts$/, "");
	let test;
	try {
		test = readFileSync(join(testsDir, `${base}.test.ts`), "utf8");
	} catch {
		console.error(`✗ ${base}: missing tests/commands/${base}.test.ts`);
		gaps++;
		continue;
	}
	const missing = flags.filter((t) => !test.includes(`"${t}"`));
	if (missing.length) {
		console.error(`✗ ${base}: untested flags → ${missing.join(" ")}`);
		gaps++;
	}
}

if (gaps) {
	console.error(`\n${gaps} command(s) with untested flags`);
	process.exit(1);
}
console.log("flag coverage: every command exercises every flag token");
