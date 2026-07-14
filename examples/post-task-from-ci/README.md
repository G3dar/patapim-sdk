# Post a task from CI

When a nightly build fails, drop a task into the project's PATAPIM Tasks panel so it's waiting for you (and your AI CLI) in the morning.

Token scopes needed: `tasks`.

```bash
PATAPIM_TOKEN=ppat_... node post-task.mjs "C:/Users/me/my-project" "CI: nightly build failed — investigate"
```
