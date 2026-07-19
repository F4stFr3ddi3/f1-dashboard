// GET /api/schedule — full current season race schedule, cached 6 hours

const SCHEDULE_URL = "https://api.jolpi.ca/ergast/f1/current.json";
const CACHE_SECONDS = 60 * 60 * 6; // 6 hours

export async function onRequestGet(context) {
  const cacheKey = new Request(context.request.url, context.request);
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const res = await fetch(SCHEDULE_URL);

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch schedule from Jolpica API" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const data = await res.json();
  const raceTable = data?.MRData?.RaceTable;

  const races = (raceTable?.Races ?? []).map((r) => ({
    season: r.season,
    round: r.round,
    raceName: r.raceName,
    date: r.date,
    time: r.time ?? null,
    circuitId: r.Circuit?.circuitId ?? "",
    circuitName: r.Circuit?.circuitName ?? "",
    circuitUrl: r.Circuit?.url ?? "",
    locality: r.Circuit?.Location?.locality ?? "",
    country: r.Circuit?.Location?.country ?? "",
    lat: r.Circuit?.Location?.lat ?? null,
    long: r.Circuit?.Location?.long ?? null,
    url: r.url,
    firstPractice: r.FirstPractice ?? null,
    secondPractice: r.SecondPractice ?? null,
    thirdPractice: r.ThirdPractice ?? null,
    qualifying: r.Qualifying ?? null,
    sprint: r.Sprint ?? null,
  }));

  const payload = {
    season: raceTable?.season ?? null,
    races,
  };

  const response = new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
    },
  });

  context.waitUntil(cache.put(cacheKey, response.clone()));

  return response;
}
