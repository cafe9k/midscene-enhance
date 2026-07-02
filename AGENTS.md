# AGENTS.md

Canonical instructions for coding agents in this repository. `CLAUDE.md`
should point here instead of duplicating rules.

## Design Principles

- Throw errors instead of returning blank values when something goes wrong.
- Report dump serialization format (`ScreenshotRef`, `ReportActionDump` JSON)
  does not need backward compatibility with older formats. Old report files are
  disposable and can be regenerated, so do not add legacy-format shims when
  changing the serialization schema.

## Default Workflow

- NEVER force push anything unless you are explicitly told to do so.
- Use `pnpm` only. The workspace requires Node `>=18.19.0` and pnpm
  `>=9.3.0`.
- Read `CONTRIBUTING.md` before local development. Dev/build workflows,
  app-local dev servers, and report rebuild troubleshooting are maintained
  there to avoid duplication.
- Before creating a commit or updating a PR, run `pnpm run lint` from the
  repository root.
- For code changes, run the smallest relevant Nx target for each touched
  project instead of defaulting to full monorepo validation.
- AI tests require some environment variables like `MIDSCENE_MODEL_BASE_URL` to be set.

## Change Rules That Actually Matter

- Add or update tests when behavior changes. Start with the nearest unit test
  suite; use AI tests or e2e only when the change actually depends on model
  behavior or browser/device integration.
- Do not hand-edit generated output under `dist/` or `apps/site/doc_build/`.
- When changing shared packages or exported entry points, run a focused build
  for the affected project before finishing.

## Commit And PR Rules

- Commits must follow Conventional Commits with a required scope.
- Scope values come from directory names under `apps/` and `packages/`, plus
  shared scopes in `commitlint.config.js` such as `workflow`, `llm`,
  `playwright`, `puppeteer`, and `bridge`.
- Important mismatch: use `web-integration` as the commit scope for changes
  under `packages/web-integration`, even though the published package name is
  `@midscene/web`.
- Important mismatch: use `site` as the commit scope for `apps/site`, even
  though the Nx project name is `doc`.
- In PR summaries, list the actual validation commands you ran.

## Docs And I18n

- Treat user-facing docs as bilingual by default.
- If you edit `README.md`, update `README.zh.md` in the same change.
- If you edit `apps/site/docs/en/**`, inspect and update the corresponding
  file under `apps/site/docs/zh/**`. Do the same in the opposite direction.
- The English and Chinese trees are not perfectly mirrored. If the counterpart
  file does not exist, decide whether to add it or call out the intentional
  gap in your final summary.
- Before editing site copy, read `apps/site/agents.md` for terminology rules.
  It already documents translation constraints such as keeping `API Key` and
  `Agent` untranslated in Chinese where appropriate.

## Validation Guidance

- Docs-only change: usually `pnpm run lint` is enough.
- Single-package code change: run `pnpm run lint` plus the smallest relevant
  `npx nx test <project>` and, if exports/build wiring changed,
  `npx nx build <project>`.
- Cross-package runtime or build-system change: run `pnpm run lint` and say
  explicitly if broader validation is still outstanding.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **midscene-enhance** (18268 symbols, 35573 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/midscene-enhance/context` | Codebase overview, check index freshness |
| `gitnexus://repo/midscene-enhance/clusters` | All functional areas |
| `gitnexus://repo/midscene-enhance/processes` | All execution flows |
| `gitnexus://repo/midscene-enhance/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
