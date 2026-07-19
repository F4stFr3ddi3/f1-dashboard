(function () {
  "use strict";

  const seasonLabelEl = document.getElementById("season-label");
  const countdownContentEl = document.getElementById("countdown-content");
  const driverTbody = document.querySelector("#driver-standings-table tbody");
  const constructorTbody = document.querySelector(
    "#constructor-standings-table tbody"
  );
  const resultsTbody = document.querySelector("#results-table tbody");
  const resultsHeading = document.getElementById("results-heading");
  const circuitDetailEl = document.getElementById("circuit-detail");

  let countdownTimerId = null;

  init();

  async function init() {
    loadStandings();
    loadResults();
    loadSchedule();
  }

  // ---------- Standings ----------

  async function loadStandings() {
    try {
      const res = await fetch("/api/standings");
      if (!res.ok) throw new Error("Request failed: " + res.status);
      const data = await res.json();

      if (data.season) {
        seasonLabelEl.textContent = data.season + " Season";
      }

      renderDriverStandings(data.drivers ?? []);
      renderConstructorStandings(data.constructors ?? []);
    } catch (err) {
      console.error("Failed to load standings", err);
      driverTbody.innerHTML =
        '<tr><td colspan="4" class="error-text">Unable to load driver standings.</td></tr>';
      constructorTbody.innerHTML =
        '<tr><td colspan="4" class="error-text">Unable to load constructor standings.</td></tr>';
    }
  }

  function renderDriverStandings(drivers) {
    if (!drivers.length) {
      driverTbody.innerHTML =
        '<tr><td colspan="4" class="loading">No standings available.</td></tr>';
      return;
    }

    driverTbody.innerHTML = drivers
      .map((d) => {
        const fullName = escapeHtml(d.givenName + " " + d.familyName);
        const code = d.code ? escapeHtml(d.code) : "";
        return `
          <tr>
            <td>${posBadge(d.position)}</td>
            <td>
              <span class="driver-name">${fullName}</span>
              ${code ? `<span class="driver-code">${code}</span>` : ""}
            </td>
            <td class="team-name">${escapeHtml(d.constructorName)}</td>
            <td class="col-num">${escapeHtml(d.points)}</td>
          </tr>
        `;
      })
      .join("");
  }

  function renderConstructorStandings(constructors) {
    if (!constructors.length) {
      constructorTbody.innerHTML =
        '<tr><td colspan="4" class="loading">No standings available.</td></tr>';
      return;
    }

    constructorTbody.innerHTML = constructors
      .map(
        (c) => `
          <tr>
            <td>${posBadge(c.position)}</td>
            <td class="driver-name">${escapeHtml(c.name)}</td>
            <td class="col-num">${escapeHtml(c.wins)}</td>
            <td class="col-num">${escapeHtml(c.points)}</td>
          </tr>
        `
      )
      .join("");
  }

  // ---------- Results ----------

  async function loadResults() {
    try {
      const res = await fetch("/api/results");
      if (!res.ok) throw new Error("Request failed: " + res.status);
      const data = await res.json();

      if (data.race) {
        resultsHeading.textContent = `Results — ${data.race.raceName}`;
      }

      renderResults(data.results ?? []);
    } catch (err) {
      console.error("Failed to load results", err);
      resultsTbody.innerHTML =
        '<tr><td colspan="6" class="error-text">Unable to load race results.</td></tr>';
    }
  }

  function renderResults(results) {
    if (!results.length) {
      resultsTbody.innerHTML =
        '<tr><td colspan="6" class="loading">No results available.</td></tr>';
      return;
    }

    resultsTbody.innerHTML = results
      .map((r) => {
        const fullName = escapeHtml(r.givenName + " " + r.familyName);
        const code = r.code ? escapeHtml(r.code) : "";
        const timeOrStatus = r.time
          ? escapeHtml(r.time)
          : escapeHtml(r.status);
        return `
          <tr>
            <td>${posBadge(r.position)}</td>
            <td>
              <span class="driver-name">${fullName}</span>
              ${code ? `<span class="driver-code">${code}</span>` : ""}
            </td>
            <td class="team-name">${escapeHtml(r.constructorName)}</td>
            <td class="col-num">${escapeHtml(r.grid)}</td>
            <td>${timeOrStatus}</td>
            <td class="col-num">${escapeHtml(r.points)}</td>
          </tr>
        `;
      })
      .join("");
  }

  // ---------- Schedule / Countdown ----------

  async function loadSchedule() {
    try {
      const res = await fetch("/api/schedule");
      if (!res.ok) throw new Error("Request failed: " + res.status);
      const data = await res.json();

      const races = data.races ?? [];
      const nextRace = findNextRace(races);

      if (!nextRace) {
        countdownContentEl.innerHTML =
          '<p class="loading">No upcoming races on the calendar.</p>';
        return;
      }

      renderCountdownShell(nextRace);
      startCountdownTimer(nextRace);
      renderCircuitDetail(nextRace);
    } catch (err) {
      console.error("Failed to load schedule", err);
      countdownContentEl.innerHTML =
        '<p class="error-text">Unable to load the race schedule.</p>';
    }
  }

  function findNextRace(races) {
    const now = Date.now();
    for (const race of races) {
      const raceDate = raceDateTime(race);
      if (raceDate && raceDate.getTime() >= now) {
        return race;
      }
    }
    return null;
  }

  function raceDateTime(race) {
    if (!race.date) return null;
    const timePart = race.time ?? "00:00:00Z";
    const iso = `${race.date}T${timePart}`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  function renderCountdownShell(race) {
    const raceDate = raceDateTime(race);
    const location = [race.locality, race.country].filter(Boolean).join(", ");
    const dateLabel = raceDate
      ? raceDate.toLocaleString(undefined, {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        })
      : race.date;

    countdownContentEl.innerHTML = `
      <div class="race-info">
        <div class="race-round">Round ${escapeHtml(race.round)}</div>
        <div class="race-name">${escapeHtml(race.raceName)}</div>
        <div class="race-location">${escapeHtml(race.circuitName)}${
      location ? " · " + escapeHtml(location) : ""
    }</div>
        <div class="race-date">${escapeHtml(dateLabel)}</div>
      </div>
      <div class="countdown-timer" id="countdown-timer">
        ${timerUnit("--", "Days")}
        ${timerUnit("--", "Hrs")}
        ${timerUnit("--", "Min")}
        ${timerUnit("--", "Sec")}
      </div>
    `;
  }

  function renderCircuitDetail(race) {
    const lat = parseFloat(race.lat);
    const long = parseFloat(race.long);

    if (isNaN(lat) || isNaN(long)) {
      circuitDetailEl.classList.remove("is-visible");
      circuitDetailEl.innerHTML = "";
      return;
    }

    const latOffset = 0.025;
    const lonOffset = 0.025 / Math.max(Math.cos((lat * Math.PI) / 180), 0.15);
    const bbox = [
      long - lonOffset,
      lat - latOffset,
      long + lonOffset,
      lat + latOffset,
    ].join(",");
    const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
      bbox
    )}&layer=mapnik&marker=${lat}%2C${long}`;
    const largeMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${long}#map=15/${lat}/${long}`;
    const location = [race.locality, race.country].filter(Boolean).join(", ");

    circuitDetailEl.innerHTML = `
      <div class="circuit-map-wrap">
        <iframe
          src="${mapSrc}"
          title="Map of ${escapeHtml(race.circuitName)}"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
        <span class="circuit-map-label">${escapeHtml(race.circuitName)}</span>
      </div>
      <div class="circuit-info">
        <div class="circuit-info-heading">Circuit Info</div>
        <div class="circuit-info-row">
          <span class="circuit-info-key">Circuit</span>
          <span class="circuit-info-value">${escapeHtml(race.circuitName)}</span>
        </div>
        <div class="circuit-info-row">
          <span class="circuit-info-key">Location</span>
          <span class="circuit-info-value">${escapeHtml(location || "—")}</span>
        </div>
        <div class="circuit-info-row">
          <span class="circuit-info-key">Coordinates</span>
          <span class="circuit-info-value">${lat.toFixed(4)}, ${long.toFixed(4)}</span>
        </div>
        <div class="circuit-links">
          <a class="circuit-link" href="${largeMapUrl}" target="_blank" rel="noopener noreferrer">Open map ↗</a>
          ${
            race.circuitUrl
              ? `<a class="circuit-link" href="${escapeHtml(
                  race.circuitUrl
                )}" target="_blank" rel="noopener noreferrer">Circuit history ↗</a>`
              : ""
          }
        </div>
      </div>
    `;
    circuitDetailEl.classList.add("is-visible");
  }

  function timerUnit(value, label) {
    return `
      <div class="timer-unit">
        <span class="timer-value" data-unit="${label.toLowerCase()}">${value}</span>
        <span class="timer-label">${label}</span>
      </div>
    `;
  }

  function startCountdownTimer(race) {
    const raceDate = raceDateTime(race);
    if (!raceDate) return;

    if (countdownTimerId) {
      clearInterval(countdownTimerId);
    }

    tick();
    countdownTimerId = setInterval(tick, 1000);

    function tick() {
      const now = Date.now();
      const diff = raceDate.getTime() - now;

      if (diff <= 0) {
        clearInterval(countdownTimerId);
        const timerEl = document.getElementById("countdown-timer");
        if (timerEl) {
          timerEl.innerHTML = '<span class="race-live">Race weekend is live</span>';
        }
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setUnit("days", days);
      setUnit("hrs", hours);
      setUnit("min", minutes);
      setUnit("sec", seconds);
    }
  }

  function setUnit(unit, value) {
    const el = document.querySelector(`[data-unit="${unit}"]`);
    if (el) {
      el.textContent = String(value).padStart(2, "0");
    }
  }

  // ---------- Helpers ----------

  function posBadge(position) {
    const pos = escapeHtml(String(position));
    const posNum = parseInt(position, 10);
    const cls =
      posNum === 1
        ? "pos-badge pos-1"
        : posNum === 2
        ? "pos-badge pos-2"
        : posNum === 3
        ? "pos-badge pos-3"
        : "pos-badge";
    return `<span class="${cls}">${pos}</span>`;
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
