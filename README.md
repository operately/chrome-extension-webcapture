# Capture to Operately

A focused Chrome extension that turns the current webpage into an Operately task.

## What it does

- Prefills an editable task name from the page title.
- Lists active projects and editable, active space task boards across the user's Operately companies.
- Remembers the last destination.
- Adds the source URL as a linked task description.
- Assigns the task to the signed-in user.
- Preserves the captured page while the user signs in and resumes capture automatically.
- Shows a direct link after the task is created.
- Supports Operately Cloud and self-hosted Operately servers.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this directory.
4. Pin **Capture to Operately** to the toolbar.

The default server is `https://app.operately.com`. For a self-hosted installation, open the extension settings and enter its base URL. Chrome will ask for access to that specific host.

## Development

The extension has no build step or runtime dependencies.

```sh
npm test
npm run check
```

Reload the extension from `chrome://extensions` after changing source files.

## Permissions

- `activeTab`: reads only the title and URL of the page captured when the toolbar button is clicked.
- `storage`: remembers the selected destination, server, and an in-progress capture during sign-in.
- Operately host access: sends authenticated API requests to the configured Operately server. Self-hosted access is requested only when that server is saved in settings.

The extension does not inject scripts into webpages and does not send capture data anywhere except the configured Operately server.
