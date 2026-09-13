import { createFileRoute } from "@tanstack/react-router";
import { handleApiRequest } from "@/lib/api/dispatch";

async function handle({ request, params }: { request: Request; params: { _splat?: string } }) {
  return handleApiRequest(request, params._splat);
}

export const Route = createFileRoute("/api/v1/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      PUT: handle,
      DELETE: handle,
    },
  },
});
