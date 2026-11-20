import test from "node:test";
import assert from "node:assert/strict";

import {
  belongsToServer,
  buildTaskInput,
  buildTaskUrl,
  capturedPage,
  makeDestinations,
  normalizeBaseUrl,
  pageDescription,
  permissionPattern,
  preferredDestination,
} from "../src/lib.js";

test("normalizes server URLs and permission patterns", () => {
  assert.equal(normalizeBaseUrl(" https://app.operately.com/// "), "https://app.operately.com");
  assert.equal(normalizeBaseUrl("http://localhost:4000/operately/"), "http://localhost:4000/operately");
  assert.equal(permissionPattern("http://localhost:4000/operately"), "http://localhost/*");
  assert.throws(() => normalizeBaseUrl("file:///tmp/operately"), /HTTPS/);
  assert.throws(() => normalizeBaseUrl("http://operately.example.com"), /HTTPS/);
  assert.throws(() => normalizeBaseUrl("https://example.com/?token=secret"), /query/);
});

test("matches only pages inside the configured server", () => {
  assert.equal(belongsToServer("https://app.operately.com/acme", "https://app.operately.com"), true);
  assert.equal(belongsToServer("https://app.operately.com.evil.test/acme", "https://app.operately.com"), false);
  assert.equal(belongsToServer("https://example.com/operately/acme", "https://example.com/operately"), true);
  assert.equal(belongsToServer("https://example.com/other", "https://example.com/operately"), false);
});

test("captures only regular web pages", () => {
  assert.deepEqual(capturedPage({ title: "  Example page ", url: "https://example.com/a" }), {
    title: "Example page",
    url: "https://example.com/a",
  });
  assert.throws(() => capturedPage({ title: "Extensions", url: "chrome://extensions" }), /regular webpage/);
});

test("creates a linked rich-text description", () => {
  const url = "https://example.com/read?a=1";
  const doc = JSON.parse(pageDescription(url));
  assert.equal(doc.type, "doc");
  assert.equal(doc.content[0].content[0].text, url);
  assert.equal(doc.content[0].content[0].marks[0].attrs.href, url);
});

test("groups active projects and active space boards while omitting unavailable destinations", () => {
  const destinations = makeDestinations([
    {
      company: { id: "acme-1", name: "Acme" },
      me: { id: "person-1" },
      spaces: [
        {
          id: "space-2",
          name: "View only",
          permissions: { can_edit: false },
          tools: { tasks_enabled: true },
          boards: [{ id: "board-3", name: "Hidden" }],
        },
        {
          id: "space-1",
          name: "General",
          permissions: { can_edit: true },
          tools: { tasks_enabled: true },
          boards: [
            { id: "board-2", name: "Tasks" },
            { id: "board-1", name: "Planning" },
          ],
        },
        {
          id: "space-3",
          name: "No tasks",
          permissions: { can_edit: true },
          tools: { tasks_enabled: false },
          boards: [{ id: "board-4", name: "Hidden" }],
        },
      ],
      projects: [
        { id: "project-2", name: "Paused", state: "paused" },
        { id: "project-3", name: "Closed", state: "closed" },
        { id: "project-1", name: "Launch", state: "active", space: { name: "General" } },
      ],
    },
  ]);

  assert.deepEqual(destinations.map((destination) => destination.name), ["Launch", "Planning", "Tasks"]);
  assert.deepEqual(destinations.map((destination) => destination.type), ["project", "space", "space"]);
  assert.equal(destinations[0].context, "General");
  assert.equal(destinations[1].boardId, "board-1");
  assert.equal(destinations[1].assigneeId, "person-1");
});

test("prefers the remembered destination when it still exists", () => {
  const destinations = [{ key: "one" }, { key: "two" }];
  assert.equal(preferredDestination(destinations, "two").key, "two");
  assert.equal(preferredDestination(destinations, "missing").key, "one");
  assert.equal(preferredDestination([], "missing"), null);
});

test("builds the create payload with current user assignment", () => {
  const destination = { type: "project", id: "project-1", assigneeId: "person-1" };
  const input = buildTaskInput({ title: " Read this ", url: "https://example.com", destination });
  assert.equal(input.name, "Read this");
  assert.equal(input.assignee_id, "person-1");
  assert.equal(input.type, "project");
  assert.equal(input.due_date, null);
  assert.equal("board_id" in input, false);
  assert.equal(JSON.parse(input.description).content[0].content[0].text, "https://example.com");
});

test("targets the selected board when creating a space task", () => {
  const destination = { type: "space", id: "space-1", boardId: "board-2", assigneeId: "person-1" };
  const input = buildTaskInput({ title: "Plan", url: "https://example.com", destination });
  assert.equal(input.id, "space-1");
  assert.equal(input.board_id, "board-2");
});

test("omits the assignee when assignment is turned off", () => {
  const destination = {
    type: "project",
    id: "project-1",
    assigneeId: "person-1",
    assignToMe: false,
  };
  const input = buildTaskInput({ title: "Plan", url: "https://example.com", destination });
  assert.equal("assignee_id" in input, false);
});

test("builds project and space task links", () => {
  assert.equal(
    buildTaskUrl("https://app.operately.com", "acme-123", { id: "task-1", type: "project" }),
    "https://app.operately.com/acme-123/tasks/task-1",
  );
  assert.equal(
    buildTaskUrl("https://app.operately.com", "acme-123", {
      id: "task-1",
      type: "space",
      space_id: "space-1",
      board_id: "board-1",
    }),
    "https://app.operately.com/acme-123/spaces/space-1/boards/board-1?taskId=task-1",
  );
});
