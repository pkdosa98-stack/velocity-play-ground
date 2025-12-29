# Velocity Playground

A lightweight web-based playground for experimenting with Apache Velocity templates. It includes syntax highlighting, beautification/indentation, escape and unescape helpers, and pre-wired helper libraries for dates and math. The project ships with a small Express server that renders templates safely using `velocityjs`.

## Overview

The playground offers:

- **Syntax highlighting** via Ace.
- **Beautification** to re-indent common Velocity directives.
- **Escape / unescape** utilities to guard HTML output.
- **Built-in helpers** for dates, math, and string escaping.
- **Sample templates** and reusable context data.
- **Server-side rendering endpoint** with request-size limits, sanitization, and Helmet protections.

> ⚠️ The sandbox is intended for local experimentation. Do not expose it to untrusted users or run arbitrary templates in multi-tenant environments without additional hardening.

## Prerequisites

- Node.js 18 or later
- npm 9 or later

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The server starts on [http://localhost:3000](http://localhost:3000) and serves the playground UI. Requests are limited to 100kb by default (`PAYLOAD_LIMIT` controls this).

## Running

```bash
npm start
```

## Tests / Validation

```bash
npm test
```

Runs ESLint against the project sources for static validation.

## Features

- **Code editor with highlighting**: Ace configured for Velocity and JSON modes.
- **Template beautifier**: Re-indents common directives (`#if`, `#foreach`, `#macro`, `#parse`) and optionally prettifies via `pretty-data`.
- **Context formatter**: Pretty-prints JSON context with one click.
- **Escape / unescape tools**: Quickly encode or decode HTML entities inside the template pane.
- **Auto-run + timing**: Toggle live rendering as you type with render time feedback.
- **Persistence**: Template, context, sample choice, and auto-run preference are stored in `localStorage` for quick reloads.
- **Import / export**: Upload or download JSON context; download rendered output to a file.
- **Status + size hints**: Live character count for templates and status bar for render state.
- **Date helpers**: `helpers.date.now()`, `helpers.date.format(iso, locale)`, `helpers.date.addDays(iso, days)`.
- **Math helpers**: `helpers.math.sum(...)`, `helpers.math.average(...)`, `helpers.math.max(...)`.
- **String helpers**: `helpers.strings.escapeHtml(str)`, `helpers.strings.unescapeHtml(str)`.
- **Sample templates**: Welcome email, invoice summary, and helper showcase available from the UI dropdown.
- **Error handling**: Invalid JSON contexts and render errors are surfaced in the UI with clear messages.
- **Security**: Helmet headers, JSON body limits, template sanitization (functions/symbols stripped), and a dedicated `/api/render` endpoint that merges only sanitized context with the built-in helpers.

## Usage

1. Start the server and open the playground in your browser.
2. Pick a sample template or write your own in the **Template** editor.
3. Adjust the JSON context in the **Context** editor.
4. Click **Run Template** to render; results appear in the **Rendered Output** pane.
5. Use **Beautify**, **Format Context**, **Escape HTML**, and **Unescape HTML** to adjust formatting and safety.
6. Use **Auto-run** to render as you type; watch the status bar for timing and state.
7. Import/export context JSON or download rendered output with the provided buttons.
8. Shortcut: press **Ctrl/Cmd + Enter** to run the template from either editor.

### Example template

```velocity
#set($total = $helpers.math.sum($numbers))
Hi $user.name,

Today is $helpers.date.format($now).
Your numbers are: $numbers
Their sum is $total.
```

### Example context

```json
{
  "user": { "name": "Ada Lovelace", "role": "Engineer" },
  "numbers": [1, 2, 3, 5],
  "now": "2024-06-01T12:00:00.000Z"
}
```

## Safety and limitations

- The server strips functions and symbols from user context before rendering.
- Rendering uses the `velocityjs` engine only; no filesystem or network access is exposed.
- Keep payloads small (default 100kb limit) and avoid running untrusted templates in production without further sandboxing.
- The provided helpers focus on deterministic, side-effect-free operations. Extend cautiously if adding new functionality.
- Basic rate limiting is enabled (60 req/min by default) and templates larger than 50k characters are rejected to protect the sandbox.
- The UI uses `localStorage` for convenience; clear it if you need a clean slate.

## Project structure

```
├─ public/          # Front-end assets (HTML, JS, CSS)
├─ src/server.js    # Express server and render API
├─ package.json     # Scripts and dependencies
└─ README.md        # Documentation
```
