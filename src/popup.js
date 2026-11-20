import {
  belongsToServer,
  capturedPage,
  DEFAULT_BASE_URL,
  friendlyError,
  isCapturablePage,
  preferredDestination,
} from "./lib.js";

const storage = chrome.storage.local;
const elements = {
  views: [...document.querySelectorAll(".view")],
  taskName: document.querySelector("#task-name"),
  sourceHost: document.querySelector("#source-host"),
  destination: document.querySelector("#destination"),
  assignToMe: document.querySelector("#assign-to-me"),
  form: document.querySelector("#capture-form"),
  formError: document.querySelector("#form-error"),
  createButton: document.querySelector("#create-button"),
  connectionError: document.querySelector("#connection-error"),
  createdTaskName: document.querySelector("#created-task-name"),
};

let state = { baseUrl: DEFAULT_BASE_URL, page: null, destinations: [], createdUrl: null };

document.querySelector("#settings-button").addEventListener("click", openSettings);
document.querySelector("#error-settings-button").addEventListener("click", openSettings);
document.querySelector("#retry-button").addEventListener("click", initialize);
document.querySelector("#sign-in-button").addEventListener("click", signIn);
document.querySelector("#open-operately-button").addEventListener("click", () => chrome.tabs.create({ url: state.baseUrl }));
document.querySelector("#view-task-button").addEventListener("click", () => chrome.tabs.create({ url: state.createdUrl }));
document.querySelector("#done-button").addEventListener("click", () => window.close());
elements.form.addEventListener("submit", submit);

initialize();

async function initialize() {
  showView("loading-view");
  hideFormError();

  try {
    const settings = await storage.get(["baseUrl", "lastDestination", "pendingCapture"]);
    state.baseUrl = settings.baseUrl || DEFAULT_BASE_URL;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const onOperately = belongsToServer(tab?.url, state.baseUrl);
    if (settings.pendingCapture && onOperately) {
      state.page = settings.pendingCapture;
    } else if (isCapturablePage(tab)) {
      state.page = capturedPage(tab);
      await storage.remove("pendingCapture");
    } else if (settings.pendingCapture) {
      state.page = settings.pendingCapture;
    } else {
      throw new Error("Open a regular webpage before capturing it");
    }

    const response = await send({ type: "load-destinations", baseUrl: state.baseUrl });
    await chrome.action.setBadgeText({ text: "" });
    state.destinations = response;
    if (!state.destinations.length) {
      showView("empty-view");
      return;
    }

    renderForm(settings.lastDestination);
    showView("capture-view");
    elements.taskName.focus();
    elements.taskName.select();
  } catch (error) {
    if (error.code === "unauthorized") {
      await storage.set({ pendingCapture: state.page });
      showView("auth-view");
      return;
    }

    elements.connectionError.textContent = friendlyError(error);
    showView("error-view");
  }
}

function renderForm(lastDestination) {
  elements.taskName.value = state.page.title;
  elements.sourceHost.textContent = displayUrl(state.page.url);
  elements.destination.textContent = "";

  const hasMultipleCompanies = new Set(state.destinations.map((destination) => destination.companyId)).size > 1;
  const groups = [
    ["Projects", state.destinations.filter((destination) => destination.type === "project")],
    ["Space task boards", state.destinations.filter((destination) => destination.type === "space")],
  ];

  for (const [label, destinations] of groups) {
    if (!destinations.length) continue;
    const group = document.createElement("optgroup");
    group.label = label;
    for (const destination of destinations) {
      const option = document.createElement("option");
      option.value = destination.key;
      const company = hasMultipleCompanies ? ` · ${destination.companyName}` : "";
      option.textContent = `${destination.name} — ${destination.context}${company}`;
      group.append(option);
    }
    elements.destination.append(group);
  }

  const preferred = preferredDestination(state.destinations, lastDestination);
  elements.destination.value = preferred.key;
}

async function submit(event) {
  event.preventDefault();
  hideFormError();
  const destination = selectedDestination();
  if (!destination) return;

  elements.createButton.disabled = true;
  elements.createButton.querySelector("span").textContent = "Creating…";

  try {
    const page = { ...state.page, title: elements.taskName.value.trim() };
    const taskDestination = { ...destination, assignToMe: elements.assignToMe.checked };
    const created = await send({ type: "create-task", baseUrl: state.baseUrl, page, destination: taskDestination });
    state.createdUrl = created.url;
    elements.createdTaskName.textContent = created.task.name;
    await storage.set({ lastDestination: destination.key });
    await storage.remove("pendingCapture");
    showView("success-view");
  } catch (error) {
    if (error.code === "unauthorized") {
      await storage.set({ pendingCapture: { ...state.page, title: elements.taskName.value.trim() } });
      showView("auth-view");
    } else {
      elements.formError.textContent = friendlyError(error);
      elements.formError.classList.remove("hidden");
    }
  } finally {
    elements.createButton.disabled = false;
    elements.createButton.querySelector("span").textContent = "Create task";
  }
}

async function signIn() {
  await storage.set({ pendingCapture: { ...state.page, title: elements.taskName.value?.trim() || state.page.title } });
  const tab = await chrome.tabs.create({ url: `${state.baseUrl}/log_in` });
  await storage.set({ authTabId: tab.id });
  window.close();
}

function selectedDestination() {
  return state.destinations.find((destination) => destination.key === elements.destination.value) || null;
}

function displayUrl(value) {
  const url = new URL(value);
  return `${url.hostname}${url.pathname === "/" ? "" : url.pathname}`;
}

function showView(id) {
  elements.views.forEach((view) => view.classList.toggle("hidden", view.id !== id));
}

function hideFormError() {
  elements.formError.classList.add("hidden");
  elements.formError.textContent = "";
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

async function send(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (response?.ok) return response.data;
  throw Object.assign(new Error(response?.error?.message || "Unexpected extension error"), response?.error);
}
