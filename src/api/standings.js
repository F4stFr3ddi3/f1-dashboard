// GET /api/standings — current driver + constructor standings, cached 1 hour

const DRIVERS_URL = "https://api.jolpi.ca/ergast/f1/current/driverStandings.json";
const CONSTRUCTORS_URL = "https://api.jolpi.ca/ergast/f1/current/constructorStandings.json";
const CACHE_SECONDS = 60 * 60; // 1 hour

export async function handleStandings(request, ctx) {
  const cacheKey = new Request(request.url, request);
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const [driversRes, constructorsRes] = await Promise.all([
    fetch(DRIVERS_URL),
    fetch(CONSTRUCTORS_URL),
  ]);

  if (!driversRes.ok || !constructorsRes.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch standings from Jolpica API" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const driversData = await driversRes.json();
  const constructorsData = await constructorsRes.json();

  const driverStandingsList =
    driversData?.MRData?.StandingsTable?.StandingsLists?.[0];
  const constructorStandingsList =
    constructorsData?.MRData?.StandingsTable?.StandingsLists?.[0];

  const drivers = (driverStandingsList?.DriverStandings ?? []).map((d) => ({
    position: d.position,
    points: d.points,
    wins: d.wins,
    driverId: d.Driver.driverId,
    givenName: d.Driver.givenName,
    familyName: d.Driver.familyName,
    code: d.Driver.code,
    permanentNumber: d.Driver.permanentNumber,
    nationality: d.Driver.nationality,
    constructorName: d.Constructors?.[0]?.name ?? "",
  }));

  const constructors = (constructorStandingsList?.ConstructorStandings ?? []).map(
    (c) => ({
      position: c.position,
      points: c.points,
      wins: c.wins,
      constructorId: c.Constructor.constructorId,
      name: c.Constructor.name,
      nationality: c.Constructor.nationality,
    })
  );

  const payload = {
    season: driverStandingsList?.season ?? null,
    round: driverStandingsList?.round ?? null,
    drivers,
    constructors,
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
