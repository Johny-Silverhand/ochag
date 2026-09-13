import { createServerFn } from "@tanstack/react-start";
import { handleApiRequest } from "./dispatch";

export const callOchagApi = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const v = input as { path: string; method?: string; body?: unknown; token?: string };
    if (!v?.path) throw new Error("path required");
    return v;
  })
  .handler(async ({ data }) => {
    const headers = new Headers({ "content-type": "application/json" });
    if (data.token) headers.set("authorization", `Bearer ${data.token}`);
    const req = new Request(`http://ochag.local/api/v1/${data.path}`, {
      method: data.method ?? "POST",
      headers,
      body: data.method === "GET" ? undefined : JSON.stringify(data.body ?? {}),
    });
    const res = await handleApiRequest(req, data.path);
    return { status: res.status, data: (await res.json()) as unknown };
  });
