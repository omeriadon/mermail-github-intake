# Superteam submission — Mermail GitHub Intake

## One-line pitch

**Mermail GitHub Intake turns an untrusted email bug report into an evidence-linked GitHub issue whose exact effect is SHA-256 approval-bound and idempotently reconciled instead of blindly retried.**

## Short description

A reusable Mermail Agent Skill for engineering intake. It reads a bounded, scan-gated Mermail report; records sender-authentication and evidence coverage; strips prompt-injection instructions, secrets, and unnecessary reporter PII; checks open/closed GitHub issues for duplicates; freezes the exact issue effect; binds fresh approval to a deterministic fingerprint; creates at most once; and reconciles ambiguous writes by that fingerprint. Optional reporter acknowledgement is a separately approved Mermail effect.

## AI client

Codex.

## Public deliverables

- Standalone source: https://github.com/omeriadon/mermail-github-intake
- Interactive judge demo: https://mermail-github-intake-omeriadons-projects.vercel.app
- Live Mermail proof: https://github.com/omeriadon/mermail-github-intake/blob/main/LIVE_TEST.md
- Mermail companion discussion: https://github.com/Nudgen-Marketing/mermail-skills/issues/190
- Skill: `skills/mermail-github-intake/SKILL.md`
- Security contract: `skills/mermail-github-intake/references/security.md`
- Tool contract: `skills/mermail-github-intake/references/tools.md`
- Deterministic proof: `npm test && npm run demo`
- Video walkthrough/script: `DEMO.md`
- Required upstream Mermail PR: added before final submission
- Required X demo URL: added before final submission

## Why this is not another inbox triager

The workflow is specialized around a high-risk seam: **public email evidence becoming a public engineering mutation**.

It adds four reusable guarantees beyond extraction:

1. **Evidence coverage** — omitted/truncated Mermail content remains explicitly partial; missing bug facts are never invented.
2. **Duplicate/source identity** — source markers distinguish exact replay from semantic similarity.
3. **Fingerprint-bound approval** — repository, title, body, labels, and Mermail source IDs are SHA-256 bound; any post-preview mutation returns `approval_stale`.
4. **One-write reconciliation** — a timeout/502/ambiguous create is never automatically replayed. The agent searches the fingerprint marker and returns confirmed `created` or `write_uncertain`.

When Mermail Composio GitHub is connected, the skill discovers the relevant capability and inspects its live schema/`risk`/`allowed`/`connected` state before execution rather than inventing provider action names. Host GitHub tools and `gh` remain fallbacks.

## Real working proof

A real external email reached a ready Mermail inbox and was processed by Codex over Mermail MCP.

The message intentionally contained:

- a grounded export bug;
- an instruction attempting to change the trusted repository and publish immediately;
- a synthetic credential marker.

Observed result:

- `scan_status: clean`;
- repository remained the separately supplied trusted repository;
- embedded routing/publish instruction ignored;
- credential marker omitted;
- bounded GitHub duplicate search found no match;
- exact issue preview returned;
- zero GitHub writes before approval;
- terminal state `draft_ready` waiting for fresh approval.

See `LIVE_TEST.md` for the safe evidence record.

## Deterministic proof suite

Seven scenarios exercise both happy-path and failure-state contracts:

1. adversarial clean report → `draft_ready`, zero writes;
2. strong semantic duplicate → `duplicate_candidate`;
3. unsafe scan → `blocked_scan`;
4. materially truncated evidence → `needs_information`;
5. same source marker → exact duplicate;
6. payload mutation after approval → `approval_stale`, zero writes;
7. ambiguous write → one create attempt, fingerprint reconciliation, zero automatic retries.

GitHub Actions executes the validator/demo on each push.

## Demo-video plan

The 2–5 minute English video will show the actual skill, not a code walkthrough:

1. show the ready Mermail inbox and delivered adversarial test report;
2. show the exact `$mermail-github-intake` prompt in Codex;
3. show Mermail MCP tools being used and `scan_status: clean`;
4. show the injected repository/publish instruction and synthetic credential being excluded;
5. show the exact GitHub preview, duplicate result, coverage, and approval fingerprint;
6. approve exactly that fingerprint;
7. show one GitHub issue creation and the resulting issue URL;
8. open the issue and show the source/fingerprint marker and absence of the injected/secret content;
9. finish on the interactive demo/proof-suite summary.

The X post will tag `@Mermailapp` and link the public upstream PR.

## Judging fit

### Skill quality

Current Mermail frontmatter/tool contracts, explicit state machine, separate security/tools/workflow references, exact examples, automated validation.

### Working demo

Already proven live through Mermail MCP up to the deliberate approval boundary. The final recording adds the explicitly approved one-write completion.

### Reusability

Any engineering team can point the skill at a Mermail mailbox + GitHub repository. It does not depend on fixture-specific tool names or a proprietary local service.

### Innovation

The innovation is not “email creates issue”; it is **effect integrity across an adversarial intake boundary**: coverage provenance, exact-source deduplication, cryptographic approval binding, stale-approval rejection, and safe uncertain-write reconciliation.

## Final checklist

- [x] Reusable, well-documented `SKILL.md`
- [x] Current Mermail MCP/security conventions
- [x] Public standalone repo
- [x] Automated deterministic proof suite
- [x] Live Mermail/Codex pre-write run
- [x] Interactive demo deployed
- [x] Mermail companion issue opened
- [ ] Public PR targeting `Nudgen-Marketing/mermail-skills`
- [ ] Final approved live issue creation verified
- [ ] 2–5 minute English demo posted on X and `@Mermailapp` tagged
- [ ] X video URL added here/upstream PR
- [ ] Superteam submission filed with PR, video, description, and Codex client
