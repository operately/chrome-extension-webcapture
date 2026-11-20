export const DEFAULT_BASE_URL = "https://app.operately.com";

export function normalizeBaseUrl(value) {
  const candidate = String(value || "").trim();
  if (!candidate) return DEFAULT_BASE_URL;

  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a complete URL, such as https://app.operately.com");
  }

  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error("Use HTTPS for Operately servers. HTTP is supported only for local development.");
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error("Use only the server address, without credentials, a query, or a fragment");
  }

  const pathname = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${pathname}`;
}

export function permissionPattern(baseUrl) {
  const url = new URL(normalizeBaseUrl(baseUrl));
  return `${url.protocol}//${url.hostname}/*`;
}

export function belongsToServer(pageUrl, baseUrl) {
  try {
    const page = new URL(pageUrl);
    const server = new URL(normalizeBaseUrl(baseUrl));
    const serverPath = server.pathname.replace(/\/$/, "");
    return page.origin === server.origin && (!serverPath || page.pathname === serverPath || page.pathname.startsWith(`${serverPath}/`));
  } catch {
    return false;
  }
}

export function isCapturablePage(tab) {
  if (!tab?.url || !tab?.title) return false;
  return ["http:", "https:"].includes(new URL(tab.url).protocol);
}

export function capturedPage(tab) {
  if (!isCapturablePage(tab)) {
    throw new Error("Open a regular webpage before capturing it");
  }

  return { title: tab.title.trim() || tab.url, url: tab.url };
}

export function pageDescription(url) {
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: url,
            marks: [{ type: "link", attrs: { href: url } }],
          },
        ],
      },
    ],
  });
}

export function makeDestinations(companies) {
  return companies
    .flatMap(({ company, me, spaces = [], projects = [] }) => [
      ...spaces
        .filter((space) => space.permissions?.can_edit !== false && space.tools?.tasks_enabled !== false)
        .flatMap((space) =>
          (space.boards || []).map((board) => ({
            key: `${company.id}:space:${space.id}:board:${board.id}`,
            companyId: company.id,
            companyName: company.name,
            type: "space",
            id: space.id,
            boardId: board.id,
            name: board.name,
            context: space.name,
            assigneeId: me.id,
          })),
        ),
      ...projects
        .filter((project) => project.state === "active")
        .map((project) => ({
          key: `${company.id}:project:${project.id}`,
          companyId: company.id,
          companyName: company.name,
          type: "project",
          id: project.id,
          name: project.name,
          context: project.space?.name || "No space",
          assigneeId: me.id,
        })),
    ])
    .sort((a, b) => {
      const companyOrder = a.companyName.localeCompare(b.companyName);
      if (companyOrder !== 0) return companyOrder;
      if (a.type !== b.type) return a.type === "project" ? -1 : 1;
      const contextOrder = a.context.localeCompare(b.context);
      if (contextOrder !== 0) return contextOrder;
      return a.name.localeCompare(b.name);
    });
}

export function preferredDestination(destinations, rememberedKey) {
  return destinations.find((destination) => destination.key === rememberedKey) || destinations[0] || null;
}

export function buildTaskInput({ title, url, destination }) {
  const name = String(title || "").trim();
  if (!name) throw new Error("Add a task name");
  if (!destination) throw new Error("Choose a destination");

  return {
    type: destination.type,
    id: destination.id,
    ...(destination.type === "space" ? { board_id: destination.boardId } : {}),
    name,
    ...(destination.assignToMe !== false && destination.assigneeId ? { assignee_id: destination.assigneeId } : {}),
    description: pageDescription(url),
    due_date: null,
  };
}

export function buildTaskUrl(baseUrl, companyId, task) {
  const root = normalizeBaseUrl(baseUrl);

  if (task.type === "space" && task.space_id && task.board_id) {
    return `${root}/${encodeURIComponent(companyId)}/spaces/${encodeURIComponent(task.space_id)}/boards/${encodeURIComponent(task.board_id)}?taskId=${encodeURIComponent(task.id)}`;
  }

  return `${root}/${encodeURIComponent(companyId)}/tasks/${encodeURIComponent(task.id)}`;
}

export function friendlyError(error) {
  if (error?.code === "unauthorized") return "Your Operately session has expired. Sign in to continue.";
  if (error?.code === "permission_required") return "Allow access to this Operately server in Settings.";
  if (error?.status === 403) return "You do not have permission to create tasks there.";
  if (error?.status === 404) return "That destination is no longer available. Choose another one.";
  if (error?.status === 422 || error?.status === 400) return error.message || "Operately could not create this task.";
  return error?.message || "Could not reach Operately. Check your connection and try again.";
}
