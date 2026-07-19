// GET /api/results — results from the most recently completed race, cached 1 hour

const RESULTS_URL = "https://api.jolpi.ca/ergast/f1/current/last/results.json";
const CACHE_SECONDS = 60 * 60; // 1 hour

export async function handleResults(request, ctx) {
  const cacheKey = new Request(request.url, request);
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const res = await fetch(RESULTS_URL);

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch results from Jolpica API" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const data = await res.json();
  const race = data?.MRData?.RaceTable?.Races?.[0] ?? null;

  if (!race) {
    const emptyPayload = { race: null, results: [] };
    const emptyResponse = new Response(JSON.stringify(emptyPayload), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
      },
    });
    ctx.waitUntil(cache.put(cacheKey, emptyResponse.clone()));
    return emptyResponse;
  }

  const results = (race.Results ?? []).map((r) => ({
    position: r.position,
    positionText: r.positionText,
    points: r.points,
    grid: r.grid,
    laps: r.laps,
    status: r.status,
    driverId: r.Driver.driverId,
    givenName: r.Driver.givenName,
    familyName: r.Driver.familyName,
    code: r.Driver.code,
    permanentNumber: r.Driver.permanentNumber,
    constructorName: r.Constructor?.name ?? "",
    time: r.Time?.time ?? null,
    fastestLap: r.FastestLap
      ? {
          rank: r.FastestLap.rank,
          lap: r.FastestLap.lap,
          time: r.FastestLap.Time?.time ?? null,
        }
      : null,
  }));

  const payload = {
    race: {
      season: race.season,
      round: race.round,
      raceName: race.raceName,
      date: race.date,
      time: race.time ?? null,
      circuitName: race.Circuit?.circuitName ?? "",
      locality: race.Circuit?.Location?.locality ?? "",
      country: race.Circuit?.Location?.country ?? "",
      url: race.url,
    },
    results,
  };

  const response = new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
    },
  });

  ctx.waitUntil(cache.put(cacheKey, response.clone()));

  return response;
}
