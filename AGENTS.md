# AGENTS.md

Generic working rules for any agent (and human) contributing to this repo —
the short, always-on baseline.

## 1. Commits

One commit message per change, **one line, conventional, short**. No body.

```
feat(commands): add newWindow command
```

Other examples: `fix(flag): reject empty target`, `test(integration): add pane suite`,
`docs: simplify command jsdoc`. Stage an explicit file allowlist; keep each
commit self-consistent (command + its test + the export line together).

Never commit unless told. When changes are ready, say so and propose a commit
message — let the user commit.

## 2. Don't assume. Don't hide confusion. Surface tradeoffs.

Do not just agree with the user. If a claim looks wrong, **stop and say so** —
agreeing to be agreeable ships bugs. (Example: "non-detached returns a stream"
was assumed; reality was a plain string — the right move was to verify and push
back, not comply.)

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If the user's claim may be false, **verify it** (a quick probe against real
  tmux beats speculation) and report what you found before acting.
- If something is unclear, stop. Name what's confusing. Ask.

## 3. Simplicity first

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or configurability that wasn't requested.
- No error handling for impossible scenarios.
- Never extend the core abstraction to land a command — only the variable
  catalog may grow. Anything needing a new output type or core behaviour: stop
  and report, don't wire it up.
- If you write 200 lines and it could be 50, rewrite it.
- Ask: "Would a senior engineer call this overcomplicated?" If yes, simplify.

## 4. Comments

Comments state rationale plainly and briefly — a line or two, not a paragraph.
If a comment is longer than the code it explains, cut it.

Never leave external-tool prefixes in committed code. Strip the `ponytail`
keyword from any `ponytail:` comment, keeping only the plain rationale.
