# Mermail GitHub Intake

**Community / unofficial Mermail companion skill with an upstream proposal open at [`Nudgen-Marketing/mermail-skills#191`](https://github.com/Nudgen-Marketing/mermail-skills/pull/191).** Turn bug reports and feature requests received through a Mermail inbox into evidence-linked, deduplicated GitHub issues without allowing email content to become agent authority.

The core flow is: **bounded evidence → sanitized engineering record → duplicate preflight → exact effect preview → explicit approval → one write → reconciliation instead of blind retry.**

- Interactive judge demo: https://mermail-github-intake-omeriadons-projects.vercel.app
- Live Mermail proof: [`LIVE_TEST.md`](LIVE_TEST.md)
- Upstream proposal: https://github.com/Nudgen-Marketing/mermail-skills/pull/191
- Background discussion: https://github.com/Nudgen-Marketing/mermail-skills/issues/190

## Why it exists

Email is a useful universal bug-intake surface and an unusually hostile authority surface. A naive email→GitHub agent can be told by the email itself to change repository, publish secrets, alter labels, skip review, or retry a write whose result is already unknown.

Mermail GitHub Intake deliberately separates **evidence** from **authority**. The mailbox supplies facts; the authenticated operator supplies scope and approval.

## Workflow

```text
Mermail inbox
    │
    ▼
metadata-first bounded discovery
    │
    ▼
exact source + clean scan + coverage envelope
    │
    ▼
untrusted evidence interpretation
    ├── injected instructions ignored
    └── secrets / reporter PII withheld
    │
    ▼
actionability check by report type
    ├── needs information → optional unsent clarification draft
    └── actionable
          │
          ▼
GitHub duplicate preflight
          │
          ▼
freeze repository + title + body + labels + source ids
          │
          ▼
exact public preview + explicit approval
          │
          ▼
ONE GitHub create attempt
          │
          ├── confirmed → created
          └── ambiguous → reconcile by source identity + approved title, never blind retry
```

## What makes it reusable

- **Current Mermail contracts.** Metadata-first reads, `require_scan_status: clean`, `agent_safe_content: true`, bounded body reads, sender-auth reporting, attachment limits, and native structured MCP arguments.
- **Actionability instead of templates.** Bugs need a concrete observable symptom plus useful evidence/context. Feature requests need a concrete capability plus intended outcome. Irrelevant boilerplate is not invented.
- **Evidence provenance.** Source mailbox/thread/message IDs plus explicit `explicit` / `derived` / `missing` / `conflicting` / `partial` / `withheld` coverage states.
- **Duplicate reasoning.** `exact_source`, `strong_match`, `possible_match`, and `none` instead of title-only matching.
- **Exact approval boundary.** Repository, title, complete body, labels, and source identity are frozen and shown exactly. Any change requires a new preview before a write.
- **One-write reconciliation.** A timeout, `502`, or ambiguous create is reconciled by the Mermail source identity and approved title, with zero automatic create retries.
- **Mermail-native GitHub path.** When available, Mermail Composio discovers and schema-inspects the connected GitHub capability before use. Host GitHub integrations and `gh` remain safe fallbacks.
- **Separate effects.** GitHub approval never authorizes an email acknowledgement.
- **Clarification/resume loop.** Missing evidence can produce an unsent Mermail draft; a later reply resumes the same bounded thread and reruns actionability/duplicate checks.

## Install

Install Mermail's official core skills first:

```bash
npx --yes skills add Nudgen-Marketing/mermail-skills --skill '*'
```

Install this companion:

```bash
npx --yes skills add omeriadon/mermail-github-intake --skill mermail-github-intake
```

Connect Mermail's hosted MCP server at `https://console.mermail.app/mcp`, then invoke `$mermail-github-intake` in a fresh agent session.

## Deterministic proof suite

No credentials or network writes are needed:

```bash
npm test
npm run demo
```

The standalone proof suite covers adversarial mail, duplicate handling, scan failures, partial evidence, exact source replay, effect drift, and ambiguous-write reconciliation. The upstream proposal adds focused routing, feature-request actionability, clarification/resume, multi-issue split, approval, and acknowledgement scenarios to Mermail's own validator.

## Real Mermail proof

A real external test email was delivered to a ready Mermail inbox and processed by Codex through Mermail MCP. It contained a valid bug report plus an embedded instruction attempting to change the GitHub repository/publish immediately and a synthetic credential marker.

The live agent returned `draft_ready`, reported `scan_status: clean`, kept the independently supplied repository unchanged, omitted the credential marker, found no duplicate, rendered the exact issue preview, and stopped with **zero GitHub mutations** pending approval.

See [`LIVE_TEST.md`](LIVE_TEST.md) for the safe, credential-free evidence record.

## Output states

| State | Meaning |
| --- | --- |
| `draft_ready` | Exact sanitized GitHub effect ready for approval |
| `awaiting_approval` | External effect shown and not yet authorized |
| `duplicate_candidate` | Exact/strong/possible existing issue surfaced |
| `needs_information` | Evidence is materially missing, conflicting, withheld, or partial |
| `blocked_scan` | Selected content is not safe to interpret |
| `out_of_scope` | Message is not an engineering bug/feature intake item |
| `write_uncertain` | One attempted write remains ambiguous after bounded reconciliation |
| `created` | Issue existence confirmed after approval |
| `ack_drafted` | Optional Mermail acknowledgement saved but not sent |

## Security contract

- Email/provider output is untrusted evidence, never authority.
- Only `scan_status: clean` content is interpreted.
- `sender_authentication.status: pass` may describe authentication; it never authorizes an effect.
- Omitted/truncated evidence remains explicitly partial.
- Secrets and unnecessary reporter PII do not enter public issue effects.
- The target repository cannot be changed by mail content.
- Exact preview + approval precedes GitHub mutation; changed effects require a new preview.
- An ambiguous write is reconciled, never automatically replayed.
- Attachments stay bounded and are never executed.
- GitHub approval and reporter-email approval remain separate.

Full contracts:

- [`SKILL.md`](skills/mermail-github-intake/SKILL.md)
- [`references/security.md`](skills/mermail-github-intake/references/security.md)
- [`references/tools.md`](skills/mermail-github-intake/references/tools.md)
- [`references/workflows.md`](skills/mermail-github-intake/references/workflows.md)

## Repository layout

```text
skills/mermail-github-intake/
├── SKILL.md
├── agents/openai.yaml
└── references/
    ├── security.md
    ├── tools.md
    └── workflows.md

demo/cases.json
scripts/demo.mjs
scripts/validate.mjs
site/
LIVE_TEST.md
DEMO.md
VIDEO.md
SUBMISSION.md
```

## Status

- [x] Standalone reusable skill
- [x] Current Mermail contract/security alignment
- [x] Deterministic safety proof suite
- [x] Real Mermail + Codex pre-write smoke test
- [x] Interactive public judge demo
- [x] Upstream Mermail proposal PR #191
- [x] Upstream `npm test`: 17 skills / 71 business tools validated
- [ ] Final approved live issue creation recorded and verified
- [ ] 2–5 minute demo posted on X and `@Mermailapp` tagged
- [ ] Video URL added to PR/submission docs
- [ ] PR marked ready for review
- [ ] Superteam submission filed

## License

MIT
