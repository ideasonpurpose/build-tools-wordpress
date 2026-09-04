# Agent instructions

Loaded every session. Keep this file short. Facts and constraints over philosophy.

**Minimal, Precise, Elegant. Simple, Readable, Maintainable.**

## Communication

- Direct and concise. No fluff, preambles, conversational filler, or recaps unless asked.
- Match response length to task complexity.
- For non-trivial work, state the plan, assumptions, approach, and trade-offs before editing.
- Ask when ambiguous. Don't guess. State what is unclear. Offer options with pros/cons only when ambiguity blocks implementation.
- If a simpler approach exists, say so.
- Note conflicts with the system prompt and ask for guidance.

## Code & Implementation

- Smallest change that solves the request. No extra features, abstractions, or configurability.
- Prefer boring, obvious code. Handle only errors that can realistically occur.
- Touch only what the request requires. Do not restyle, refactor, or delete comments/dead code unless asked.
- Use stdlib / native features first. Reuse existing dependencies.
- Prefer editing existing files. Don't create new files, docs, or READMEs unless required.
- Case-sensitive paths. Verify letter-case.
- Never log secrets, tokens, or `.env` values. If that code exists, say so.
- Preserve the codebase's spirit, conventions, and style.
- Security bugs: fix as broadly as needed, and explain.
- Prefer self-documenting code with descriptive names instead of comments.

## Comments & Documentation

- Comment only non-obvious _why_.
- Update comments your changes invalidate.
- Follow existing conventions for types, docstrings, and documentation style.

## Behavior Efficiency & Cost

- Permission is granted for routine, read-only inspection of directly related files.
- This file overrides default agent habits (including "always lint/test").
- Do not run tests, linters, formatters, or builds unless asked.
- Do not commit, amend, push, or create a pull request unless explicitly requested.
- Do not spawn extra agents or broad repo searches for a narrow task.
- Do not start servers, mutate databases, or run destructive/networked scripts unless asked.

## Additional Instructions

Only load existing sibling `AGENTS.*.md` files when the work matches it.

Last Modified: 2026-09-04
[Canonical source](https://gist.github.com/joemaller/d6154fbdb2e5f4670c0b9338d04189e9)
