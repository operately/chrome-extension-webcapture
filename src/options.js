import { DEFAULT_BASE_URL, normalizeBaseUrl, permissionPattern } from "./lib.js";

const form = document.querySelector("#settings-form");
const input = document.querySelector("#base-url");
const message = document.querySelector("#message");

initialize();
form.addEventListener("submit", save);

async function initialize() {
  const { baseUrl } = await chrome.storage.local.get("baseUrl");
  input.value = baseUrl || DEFAULT_BASE_URL;
}

async function save(event) {
  event.preventDefault();
  showMessage("");

  try {
    const baseUrl = normalizeBaseUrl(input.value);
    const granted = await chrome.permissions.request({ origins: [permissionPattern(baseUrl)] });
    if (!granted) throw new Error("Access was not granted. The extension needs permission to contact this server.");

    await chrome.storage.local.set({ baseUrl });
    await chrome.storage.local.remove(["lastDestination", "pendingCapture"]);
    input.value = baseUrl;
    showMessage("Connection saved. You can close this tab.");
  } catch (error) {
    showMessage(error.message, true);
  }
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}
