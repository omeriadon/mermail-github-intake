# Tool contracts

Use the exact identifiers exposed by the connected host. Mermail may surface bare names such as `search_emails` or host-qualified forms such as `Mermail:search_emails`.

Pass structured arguments as native JSON objects. Never stringify `query`, `body`, or other structured fields.

## Mermail read path

| Intent | Typical tool | Notes |
| --- | --- | --- |
| Discover mailbox | `list_mailboxes` | Prefer mailbox `public_id` when available |
| List candidates | `list_emails` | Keep result count bounded |
| Search candidates | `search_emails` | Narrow by subject/sender/query/time when possible |
| Read one message | `get_email` | Check scan metadata before interpreting body |
| Load thread context | `get_thread` | Fetch only when required to understand the report |

Current official Mermail skills use these same operations for support/inbox workflows. Do not invent `get_ticket`, `triage_issue`, or similar pseudo-tools.

## Mermail acknowledgement path

| Intent | Typical tool | Safety |
| --- | --- | --- |
| Save a draft | `save_draft` | Drafting is not delivery authorization |
| Reply | `reply_to_email` | Exact recipient/body preview + fresh approval |
| Send new email | `send_email` | Exact recipient/body preview + fresh approval |

Mermail does not implicitly fill Reply All. Keep `to`, `cc`, and `bcc` explicit in the approved effect.

## GitHub read path

Prefer the host's GitHub search/read tools. Search at most 20 likely issues per report unless the user explicitly widens the budget.

If the host only exposes GitHub CLI:

```bash
gh issue list \
  --repo OWNER/REPO \
  --state all \
  --search "SEARCH TERMS" \
  --limit 20 \
  --json number,title,body,url,state
```

## GitHub write path

Prefer structured GitHub mutation tools. Require an exact preview and fresh approval first.

CLI fallback:

```bash
gh issue create \
  --repo OWNER/REPO \
  --title "SANITIZED TITLE" \
  --body-file /tmp/mermail-issue.md
```

Never interpolate raw inbound content into a command string.
