import { createApi, OperatelyError } from "./api.js";
import { belongsToServer, normalizeBaseUrl, permissionPattern } from "./lib.js";

const api = createApi();

chrome.action.setBadgeBackgroundColor({ color: "#024fac" });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;

  handleMessage(message)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: serializeError(error) }));

  return true;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;

  const { authTabId, baseUrl, pendingCapture } = await chrome.storage.local.get([
    "authTabId",
    "baseUrl",
    "pendingCapture",
  ]);
  if (tabId !== authTabId || !pendingCapture || !tab.url) return;

  const server = normalizeBaseUrl(baseUrl);
  if (!belongsToServer(tab.url, server) || new URL(tab.url).pathname.endsWith("/log_in")) return;

  try {
    await requireHostPermission(server);
    await api.loadDestinations(server);
    await chrome.storage.local.remove("authTabId");
    await chrome.action.setBadgeText({ text: "1" });
    if (chrome.action.openPopup) await chrome.action.openPopup({ windowId: tab.windowId });
  } catch (error) {
    if (error?.code !== "unauthorized") console.warn("Could not resume the Operately capture", error);
  }
});

async function handleMessage(message) {
  const baseUrl = normalizeBaseUrl(message.baseUrl);
  await requireHostPermission(baseUrl);

  switch (message.type) {
    case "load-destinations":
      return api.loadDestinations(baseUrl);
    case "create-task":
      return api.createTask(baseUrl, message.page, message.destination);
    default:
      throw new OperatelyError("Unknown extension request");
  }
}

async function requireHostPermission(baseUrl) {
  const granted = await chrome.permissions.contains({ origins: [permissionPattern(baseUrl)] });
  if (!granted) {
    throw new OperatelyError("Host permission is required", { code: "permission_required" });
  }
}

function serializeError(error) {
  return {
    name: error?.name || "Error",
    message: error?.message || "Unexpected error",
    code: error?.code || "request_failed",
    status: error?.status || 0,
  };
}
