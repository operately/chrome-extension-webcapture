import { buildTaskInput, buildTaskUrl, makeDestinations, normalizeBaseUrl } from "./lib.js";

export class OperatelyError extends Error {
  constructor(message, { code = "request_failed", status = 0 } = {}) {
    super(message);
    this.name = "OperatelyError";
    this.code = code;
    this.status = status;
  }
}

export function createApi(fetchImpl = fetch) {
  async function request(baseUrl, path, { companyId, method = "GET", body } = {}) {
    const headers = { Accept: "application/json" };
    if (companyId) headers["x-company-id"] = companyId;
    if (body) headers["content-type"] = "application/json";

    let response;
    try {
      response = await fetchImpl(`${normalizeBaseUrl(baseUrl)}/api/v2${path}`, {
        method,
        credentials: "include",
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new OperatelyError("Could not connect to the Operately server");
    }

    const payload = await readPayload(response);
    if (!response.ok) {
      const unauthorized = response.status === 401 || (response.status === 302 && response.headers.get("location")?.includes("log_in"));
      throw new OperatelyError(payload?.message || payload?.error || `Operately returned ${response.status}`, {
        code: unauthorized ? "unauthorized" : "request_failed",
        status: response.status,
      });
    }

    return payload;
  }

  async function loadDestinations(baseUrl) {
    const { companies = [] } = await request(baseUrl, "/companies/list");

    const results = await Promise.all(
      companies.map(async (company) => {
        const [peopleResult, spacesResult, projectsResult] = await Promise.all([
          request(baseUrl, "/people/get_me", { companyId: company.id }),
          request(baseUrl, "/spaces/list?include_permissions=true", { companyId: company.id }),
          request(baseUrl, "/projects/list?include_space=true", { companyId: company.id }),
        ]);

        const spaces = await Promise.all(
          (spacesResult.spaces || []).map(async (space) => {
            if (space.permissions?.can_edit === false || space.tools?.tasks_enabled === false) return space;

            const boardResult = await request(
              baseUrl,
              `/tasks/list_boards?space_id=${encodeURIComponent(space.id)}&archive_status=active`,
              { companyId: company.id },
            );
            return { ...space, boards: boardResult.boards || [] };
          }),
        );

        return {
          company,
          me: peopleResult.me,
          spaces,
          projects: projectsResult.projects,
        };
      }),
    );

    return makeDestinations(results);
  }

  async function createTask(baseUrl, page, destination) {
    const input = buildTaskInput({ title: page.title, url: page.url, destination });
    const { task } = await request(baseUrl, "/tasks/create", {
      companyId: destination.companyId,
      method: "POST",
      body: input,
    });

    return {
      task,
      url: buildTaskUrl(baseUrl, destination.companyId, task),
    };
  }

  return { request, loadDestinations, createTask };
}

async function readPayload(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
}
