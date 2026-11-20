# Chrome Web Store listing

## Product details

- **Name:** Capture to Operately
- **Summary:** Turn any webpage into an Operately task.
- **Category:** Productivity
- **Language:** English
- **Homepage:** https://github.com/operately/chrome-extension-webcapture
- **Support:** https://github.com/operately/chrome-extension-webcapture/issues
- **Privacy policy:** https://github.com/operately/chrome-extension-webcapture/blob/main/PRIVACY.md

## Detailed description

Capture to Operately turns the webpage you are viewing into an actionable task without interrupting your flow.

Open the extension from any webpage, review or edit the task name, choose an active Operately project or space task board, and create the task. The source URL is included automatically so your team can return to the original context.

Features:

- Create a task from the current page title and URL.
- Choose between active projects and space task boards.
- Optionally assign the task to yourself.
- Remember your most recently used destination.
- Work with Operately Cloud or an HTTPS self-hosted Operately server.
- Resume capture after signing in.

The extension accesses the current page title and URL only when you open it. That information is sent only to your configured Operately server after you click **Create task**. It does not read the page body or monitor your browsing.

## Single purpose

Create an Operately task from the title and URL of the webpage explicitly selected by the user.

## Permission justifications

### `activeTab`

Used only after the user opens the extension to read the active tab's title and URL for the task preview. It does not provide passive browsing access.

### `storage`

Stores the configured Operately server, the last selected destination, and a pending capture during sign-in so the user can resume the action.

### `https://app.operately.com/*`

Allows authenticated API requests to Operately Cloud to list destinations and create the requested task.

### Optional HTTPS host access

Supports user-configured self-hosted Operately servers. The extension requests access only to the specific HTTPS origin the user saves in Settings.

### Optional local HTTP host access

Supports Operately development servers on `localhost` or `127.0.0.1`. Remote HTTP servers are rejected.

## User data disclosures

- **Web history:** The URL of the single active page selected by the user.
- **Website content:** The title of the single active page selected by the user.
- **Authentication information:** Not collected. Requests use the browser-managed Operately session without reading or storing credentials or cookies.
- **Purpose:** App functionality only.
- **Sale or advertising:** None.

## Reviewer test instructions

1. Sign in to the provided Operately reviewer account at `https://app.operately.com`.
2. Open any regular HTTPS webpage.
3. Click **Capture to Operately** in the Chrome toolbar.
4. Confirm that the page title and URL are shown.
5. Open the destination selector and verify the **Projects** and **Space task boards** groups.
6. Leave **Assign to me** enabled or turn it off, then select **Create task**.
7. Select **View task** and verify the title, source URL, destination, and assignment in Operately.

Provide reviewer credentials only in the private **Test instructions** fields in the Chrome Web Store dashboard. Never commit credentials to this repository.
