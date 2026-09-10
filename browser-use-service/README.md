# Browser Use companion

This Python package prepares the intelligent-browser boundary for later phases. Phase 1 does not call it from the Next.js request path: deterministic Playwright extraction is cheaper, safer, and easier to verify for homepage fields.

## Setup

The commands follow the current Browser Use open-source quickstart:

```bash
cd browser-use-service
pip install uv
uv venv --python 3.12
source .venv/bin/activate
uv sync
uvx browser-use install
cp .env.example .env
```

Add `OPENAI_API_KEY` to `.env`, then run:

```bash
uv run marketing-auditor-browser https://example.com
```

The companion uses an exact-domain allowlist, disables downloads and permissions, and removes Browser Use actions that click, type, submit, upload, download, write files, scroll, or send keys. It is an opt-in development tool and is not exposed by the web application.
