# Prompt a terminal

Send a prompt to an AI CLI running in a PATAPIM terminal, wait for it to go idle, then print the tail of the terminal buffer.

Token scopes needed: `terminals:read`, `terminals:write`, `events`.

```bash
PATAPIM_TOKEN=ppat_... node prompt.mjs 3 "Run the test suite and summarize failures"
```
