import { handleStandings } from "./api/standings.js";
import { handleSchedule } from "./api/schedule.js";
import { handleResults } from "./api/results.js";

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/standings") return handleStandings(request, ctx);
    if (pathname === "/api/schedule") return handleSchedule(request, ctx);
    if (pathname === "/api/results") return handleResults(request, ctx);

    return env.ASSETS.fetch(request);
  },
};
