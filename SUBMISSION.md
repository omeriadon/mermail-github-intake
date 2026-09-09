# Superteam submission — Mermail GitHub Intake

## One-line pitch

**Mermail GitHub Intake turns untrusted inbound bug/feature email into evidence-grounded, duplicate-aware GitHub work with an exact approval boundary and one-write reconciliation instead of blind retry.**

## Short description

A reusable Mermail Agent Skill for engineering intake. It reads a bounded, scan-gated Mermail report; preserves sender-authentication and evidence coverage; strips prompt-injection instructions, secrets, and unnecessary reporter PII; applies report-type actionability rules; checks the exact GitHub repository for likely duplicates; freezes the exact public issue effect; creates at most once after approval; and reconciles ambiguous writes using the stable Mermail source identity plus approved title. Missing information can produce an unsent Mermail clarification draft, and reporter acknowledgement remains a separate effect after GitHub creation.

## AI client

Codex.

## Public deliverables

- Standalone source: https://github.com/omeriadon/mermail-github-intake
- Interactive judge demo: https://mermail-github-intake-omeriadons-projects.vercel.app
- Live Mermail proof: https://github.com/omeriadon/mermail-github-intake/blob/main/LIVE_TEST.md
- Required upstream Mermail PR: https://github.com/Nudgen-Marketing/mermail-skills/pull/191
- Proposal/background: https://github.com/Nudgen-Marketing/mermail-skills/issues/190
- Final live-created GitHub issue: https://github.com/omeriadon/mermail-github-intake/issues/2
- Final X demo: https://x.com/OmeriAdon51798/status/2097667379237142747
- Final video plan/source notes: `VIDEO.md`

## Why this is not another inbox triager

The workflow is specialized around a high-risk seam: **public email evidence becoming a public engineering mutation**.

It adds reusable guarantees beyond extraction:

1. **Authority separation** — inbound mail can provide evidence but cannot select the repository, labels, recipients, tools, or approval state.
2. **Actionability by report type** — bugs require a concrete symptom plus useful evidence/context; feature requests require a requested capability plus intended outcome. Missing boilerplate is not invented.
3. **Evidence coverage** — explicit, derived, missing, conflicting, withheld, and partial evidence remain distinguishable.
4. **Duplicate/source identity** — the stable Mermail thread/message identity detects exact replay before semantic duplicate reasoning.
5. **Exact effect approval** — repository, complete sanitized body, title, labels, and source identity are frozen and shown before the external GitHub effect. Any change requires a new preview.
6. **One-write reconciliation** — timeout/502/ambiguous create results are never automatically replayed. One bounded repository read confirms `created` or returns `write_uncertain`.
7. **Clarification/resume** — missing evidence can produce an unsent Mermail draft, then a later reporter response resumes the same bounded thread without inheriting GitHub approval.
8. **Separate effects** — GitHub creation and reporter-email delivery never share approval.

When Mermail Composio GitHub is connected, the skill discovers the relevant capability and inspects its live schema/`risk`/`allowed`/`connected` state before execution rather than inventing provider action names. Host GitHub tools and `gh` remain fallbacks.

## Real working proof

The final recording shows a real external bug-report email arriving in Mermail and being processed by Codex through Mermail MCP.

The message intentionally contained:

- a grounded CSV export bug;
- an instruction attempting to change the trusted repository and publish immediately;
- a synthetic credential marker.

Observed result:

- Mermail safe/clean content handling and source identity surfaced;
- repository remained the separately supplied trusted repository;
- embedded routing/publish instruction ignored;
- credential-like content omitted from the public effect;
- bounded GitHub duplicate checking completed;
- the complete sanitized issue effect was shown before mutation;
- zero GitHub writes occurred before explicit approval;
- after approval, exactly one issue was created and its existence independently verified;
- the resulting public issue preserves the Mermail source trace while excluding the malicious instruction and synthetic secret.

Final issue: https://github.com/omeriadon/mermail-github-intake/issues/2

Final video/X proof: https://x.com/OmeriAdon51798/status/2097667379237142747

The optional acknowledgement-draft path is part of the skill contract and focused validation scenarios, but the final demo clip intentionally focuses on the required end-to-end Mermail → GitHub workflow because the active recording surface did not expose `save_draft`.

## Validation

The upstream proposal is intentionally narrow and Mermail-native:

- 10 changed files total;
- no changes to Mermail's validator implementation, release/version files, or website;
- new skill package + root routing/catalog integration + focused scenarios only;
- local upstream `npm test` passes: **17 skills and 71 business tools validated**;
- `git diff --check` passes.

The focused upstream scenarios cover routing, clean happy path, feature-request actionability, prompt-injection resistance, scan failure, partial coverage, clarification/resume, duplicate blocking, multi-issue split handling, exact approval/create, uncertain-write reconciliation, and unsent acknowledgement.

## Final demo

The final 2–5 minute English demo shows the actual skill, not a code walkthrough:

1. the real Mermail report with engineering evidence and adversarial instructions;
2. `$mermail-github-intake` invoked in a fresh Codex session;
3. Mermail safe/clean reads and stable source identity;
4. injected repository/publish instructions ignored and synthetic credential withheld;
5. bounded duplicate checking and the exact sanitized GitHub preview;
6. explicit approval of that visible effect;
7. one real GitHub issue creation;
8. independent browser verification that the public issue exists, matches the preview, excludes malicious/credential content, and includes the Mermail source trace.

The published X post tags `@Mermailapp`, names the skill, mentions Codex, links PR #191, and carries the final demo video.

## Judging fit

### Skill quality

Current Mermail frontmatter/tool contracts, explicit state model, separate security/tools/workflows references, focused examples, upstream validation, and a deliberately small integration diff.

### Working demo

The final published recording proves the required live workflow end to end: Mermail input → sanitized evidence → duplicate preflight → exact approval boundary → one GitHub creation → independently verified result.

### Reusability

Any engineering team can point the skill at a Mermail mailbox + GitHub repository. It does not depend on fixture-specific provider slugs or a proprietary local service.

### Innovation

The innovation is not “email creates issue”; it is **effect integrity across an adversarial intake boundary**: evidence provenance, actionability without fabrication, exact-source deduplication, explicit effect freezing, one-write execution, safe uncertain-write reconciliation, and separately authorized reporter communication.

## Final checklist

- [x] Reusable, documented `SKILL.md`
- [x] Current Mermail MCP/security conventions
- [x] Public standalone repo
- [x] Automated standalone proof suite
- [x] Live Mermail/Codex pre-write run
- [x] Interactive demo deployed
- [x] Public PR targeting `Nudgen-Marketing/mermail-skills` (#191)
- [x] Upstream validation passes locally (17 skills / 71 business tools)
- [x] Final approved live issue creation verified on camera
- [x] 2–5 minute English demo rendered and posted on X with `@Mermailapp`
- [x] X video URL added here and to PR #191
- [x] PR #191 marked ready for review
- [ ] Superteam submission filed with PR, video, description, and Codex client
