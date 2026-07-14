# Authentication & scopes

## Tokens

- Created in **Preferences → Local API**; shown once; stored **hashed** (SHA-256) on disk.
- Sent per request via `x-patapim-token: ppat_...` (or `Authorization: Bearer ppat_...`).
- Only work while the **Enable Local API** toggle is on.
- Revocable individually at any time from the same Preferences panel.
- Every mutating call is written to PATAPIM's audit log (`~/.patapim/remote-access.log`) with the token id.

## Scopes (v1)

| Scope | Grants |
|-------|--------|
| `terminals:read` | List terminals, read buffers and live state |
| `terminals:write` | Create terminals, send input, resize, close |
| `tasks` | Read/manage project tasks and scheduled commands |
| `notifications` | Send notifications through the user's configured channels |
| `browser` | Drive the embedded browser (navigate, click, fill, screenshot…) |
| `files:read` | Read files in project directories |
| `files:write` | Write files in project directories |
| `events` | Connect to the WebSocket event stream (per-topic resource scopes still apply) |

Scopes are **additive-only** within v1: existing scopes never change meaning or narrow.

Deliberately **not** available to public tokens in v1: computer control, WhatsApp/Gmail integrations, and arbitrary JS evaluation in the browser. These remain internal to PATAPIM's own AI integration.

## Good practices

- One token per tool, named after the tool (`ci-deploy`, `slack-router`) — revoke independently.
- Request the minimum scopes; you can always create another token.
- Treat tokens like SSH keys. Anyone with a `terminals:write` token can type into your terminals.
