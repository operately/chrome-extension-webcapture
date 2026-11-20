import test from "node:test";
import assert from "node:assert/strict";

import { createApi } from "../src/api.js";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
}

test("loads destinations for every company using the company context header", async () => {
  const requests = [];
  const api = createApi(async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith("/companies/list")) return jsonResponse({ companies: [{ id: "acme-1", name: "Acme" }] });
    if (url.includes("/people/get_me")) return jsonResponse({ me: { id: "person-1" } });
    if (url.includes("/spaces/list")) {
      return jsonResponse({
        spaces: [
          {
            id: "space-1",
            name: "Product",
            permissions: { can_edit: true },
            tools: { tasks_enabled: true },
          },
        ],
      });
    }
    if (url.includes("/projects/list")) {
      return jsonResponse({ projects: [{ id: "project-1", name: "Launch", state: "active" }] });
    }
    if (url.includes("/tasks/list_boards")) return jsonResponse({ boards: [{ id: "board-1", name: "Tasks" }] });
    throw new Error(`Unexpected URL: ${url}`);
  });

  const destinations = await api.loadDestinations("https://app.operately.com");
  assert.deepEqual(destinations.map((destination) => destination.name), ["Launch", "Tasks"]);
  assert.equal(destinations[1].boardId, "board-1");
  assert.equal(requests[0].options.credentials, "include");
  assert.deepEqual(requests.slice(1).map(({ options }) => options.headers["x-company-id"]), [
    "acme-1",
    "acme-1",
    "acme-1",
    "acme-1",
  ]);
  assert.match(requests.at(-1).url, /tasks\/list_boards\?space_id=space-1&archive_status=active$/);
});

test("maps unauthorized responses to an auth error", async () => {
  const api = createApi(async () => jsonResponse({ message: "Sign in" }, 401));
  await assert.rejects(() => api.loadDestinations("https://app.operately.com"), (error) => {
    assert.equal(error.code, "unauthorized");
    assert.equal(error.status, 401);
    return true;
  });
});

test("creates a task and returns its application link", async () => {
  let request;
  const api = createApi(async (url, options) => {
    request = { url, options };
    return jsonResponse({ task: { id: "task-1", name: "Read", type: "project" } });
  });
  const destination = {
    type: "project",
    id: "project-1",
    companyId: "acme-1",
    assigneeId: "person-1",
  };

  const result = await api.createTask(
    "https://app.operately.com",
    { title: "Read", url: "https://example.com" },
    destination,
  );

  assert.equal(request.url, "https://app.operately.com/api/v2/tasks/create");
  assert.equal(request.options.method, "POST");
  assert.equal(JSON.parse(request.options.body).assignee_id, "person-1");
  assert.equal(result.url, "https://app.operately.com/acme-1/tasks/task-1");
});
