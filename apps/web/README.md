# @shelf/web

UI for the application.

## Utility scripts

To run the smoke test:

```bash
vp exec vpx ./scripts/smoke.ts
```

To add a remote user:

```bash
PASSWORD_PEPPER="$(cd ../../infra && pulumi config get passwordPepper)" vp exec vpx ./scripts/create-user.ts --remote
```
