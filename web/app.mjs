import { api, archive, archiveObject, displayDate, looksLikeOrigin, nameEndpoint, nameRows, officialOrigin, originCandidates, originEndpoint, validHash, visitRows } from "./model.mjs";

const get = id => document.getElementById(id);
const query = get("query");
const results = get("results");
const status = get("status");
const older = get("older");
const visitsList = get("visits");
const inspector = get("snapshot");
const matches = get("matches");
const pageSize = 12;
const maxVisits = 120;
let origin = "";
let visits = [];
let primaryRun;
let snapshotsRun;
let canLoad = false;

const element = (tag, content, className) => {
  const el = document.createElement(tag);
  if (content !== undefined) el.textContent = content;
  if (className) el.className = className;
  return el;
};

function button(label, fn) {
  const control = element("button", label, "pill");
  control.type = "button";
  control.addEventListener("click", fn);
  return control;
}

function link(label, destination) {
  const anchor = element("a", label);
  anchor.href = destination;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  return anchor;
}

function setStatus(message, error = false) {
  status.textContent = message;
  status.dataset.error = String(error);
}

function shareUrl() {
  const address = new URL(location.href);
  address.hash = "origin=" + encodeURIComponent(origin);
  return address.toString();
}

async function json(url, signal) {
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(18000)]),
    headers: { Accept: "application/json" },
    credentials: "omit",
  });
  if (!response.ok) {
    const error = new Error(response.status === 429 ? "Software Heritage is rate limiting requests. Try again in a moment." : "Software Heritage returned HTTP " + response.status + ".");
    error.httpStatus = response.status;
    throw error;
  }
  return response.json();
}

function errorText(error) {
  if (error.name === "TimeoutError") return "Software Heritage took too long to respond. You can retry or open the official archive.";
  if (error instanceof TypeError) return "Could not reach Software Heritage from this browser. You can open the official archive directly.";
  return error.message;
}

function beginLookup(keepMatches) {
  primaryRun?.abort();
  snapshotsRun?.abort();
  primaryRun = new AbortController();
  get("lookup-form").setAttribute("aria-busy", "true");
  results.hidden = true;
  if (!keepMatches) matches.hidden = true;
  return primaryRun;
}

function endLookup(run) {
  if (run === primaryRun) get("lookup-form").removeAttribute("aria-busy");
}

function lookup(raw) {
  const value = raw.trim();
  if (looksLikeOrigin(value)) find(value);
  else findByName(value);
}

async function findByName(value) {
  const run = beginLookup(false);
  let destination;
  setStatus("Searching names and paths in Software Heritage…");
  try {
    const endpoint = nameEndpoint(value);
    destination = archive + "/browse/search/?" + new URLSearchParams({ q: value });
    history.replaceState(null, "", "#name=" + encodeURIComponent(value));
    const hits = nameRows(await json(endpoint, run.signal));
    if (run !== primaryRun) return;
    const list = get("match-list");
    list.replaceChildren();
    for (const hit of hits) {
      const row = element("li", undefined, "record");
      const summary = element("div");
      summary.append(element("h3", hit.url, "mono"));
      if (hit.last_visit_date) summary.append(element("p", "Last visit " + displayDate(hit.last_visit_date), "fine"));
      row.append(summary, button("View archive visits", () => {
        query.value = hit.url;
        find(hit.url, true);
      }));
      list.append(row);
    }
    get("official-name").href = destination;
    matches.hidden = false;
    setStatus(hits.length
      ? "Showing " + hits.length + " matching origin" + (hits.length === 1 ? "." : "s.") + " Choose a repository to see its archive history."
      : "No matching repository URLs were returned. Try a shorter name or a different part of the repository path.");
  } catch (error) {
    if (run !== primaryRun || run.signal.aborted) return;
    setStatus(errorText(error), true);
    if (destination) status.append(" ", link("Search the official archive ↗", destination));
  } finally { endLookup(run); }
}

function renderVisits() {
  visitsList.replaceChildren();
  get("visit-count").textContent = visits.length ? visits.length + " shown" : "No visits";
  if (!visits.length) {
    visitsList.append(element("li", "No archive visits were returned for this origin.", "record"));
  }
  for (const row of visits) {
    const card = element("li", undefined, "record");
    const heading = element("h3", displayDate(row.date));
    const details = element("p", "Visit " + row.visit + " · " + (row.type || "Unknown loader") + " · " + (row.status || "Status unavailable"));
    card.append(heading, details);
    if (validHash(row.snapshot)) {
      card.append(element("p", "swh:1:snp:" + row.snapshot, "mono fine"));
      const actions = element("div", undefined, "actions");
      actions.append(button("Inspect snapshot", () => showSnapshot(row.snapshot)), link("Browse snapshot ↗", archiveObject("snapshot", row.snapshot)));
      card.append(actions);
    } else card.append(element("p", "This visit lists no snapshot.", "fine"));
    visitsList.append(card);
  }
  older.hidden = !canLoad;
}

async function find(raw, keepMatches = false) {
  const run = beginLookup(keepMatches);
  setStatus("Looking up the repository in Software Heritage…");
  const paths = [];
  try {
    const variants = originCandidates(raw);
    const candidates = keepMatches ? [raw, ...variants.filter(candidate => candidate !== raw)] : variants;
    let rows;
    for (const candidate of candidates) {
      paths.push(candidate);
      try {
        const found = await json(originEndpoint(candidate, "get"), run.signal);
        origin = typeof found.url === "string" && candidates.includes(found.url) ? found.url : candidate;
        rows = await json(originEndpoint(origin, "visits", { per_page: pageSize }), run.signal);
        break;
      } catch (error) {
        if (error.httpStatus !== 404) throw error;
      }
    }
    if (run !== primaryRun) return;
    if (rows === undefined) throw new Error("No archive origin matched the URL. Check the repository path or search by project name.");
    visits = visitRows(rows);
    canLoad = visits.length === pageSize;
    get("origin-url").textContent = origin;
    get("results-title").textContent = new URL(origin).hostname + new URL(origin).pathname;
    get("origin-link").href = officialOrigin(origin);
    history.replaceState(null, "", shareUrl());
    renderVisits();
    inspector.replaceChildren(element("p", visits.some(item => validHash(item.snapshot))
      ? "Choose a visit with a snapshot to examine its references."
      : "The visits shown have no linked snapshot. Check older visits or browse the archive’s origin page."));
    results.hidden = false;
    setStatus("Loaded the most recent visits returned by Software Heritage.");
    if (keepMatches) results.scrollIntoView({ block: "start" });
  } catch (error) {
    if (run !== primaryRun || run.signal.aborted) return;
    setStatus(errorText(error), true);
    if (paths.length) {
      status.append(" ", link("Check the official archive ↗", officialOrigin(paths[0])));
    }
  } finally { endLookup(run); }
}

async function loadOlder() {
  if (!canLoad || !visits.length) return;
  const run = primaryRun;
  older.disabled = true;
  setStatus("Loading older archive visits…");
  try {
    const maxTake = Math.min(maxVisits - visits.length, pageSize);
    const last = visits.at(-1).visit;
    const chunk = visitRows(await json(originEndpoint(origin, "visits", { last_visit: last, per_page: maxTake }), run.signal));
    if (run !== primaryRun) return;
    const seen = new Set(visits.map(row => row.visit));
    const added = chunk.filter(row => !seen.has(row.visit));
    visits = visits.concat(added);
    canLoad = visits.length < maxVisits && added.length > 0 && chunk.length === maxTake;
    renderVisits();
    setStatus(visits.length === maxVisits ? "Showing 120 visits. Browse the official archive for the full history." : added.length ? "Older visits added." : "No more visits were returned.");
  } catch (error) {
    if (run === primaryRun) setStatus(errorText(error), true);
  } finally { older.disabled = false; }
}

async function showSnapshot(id, from = "") {
  snapshotsRun?.abort();
  const run = new AbortController();
  snapshotsRun = run;
  inspector.replaceChildren(element("p", "Loading snapshot references…"));
  const top = element("div", undefined, "actions");
  top.append(link("Open full snapshot ↗", archiveObject("snapshot", id)));
  try {
    const params = new URLSearchParams({ branches_count: "24" });
    if (from) params.set("branches_from", from);
    const snapshot = await json(api + "snapshot/" + id + "/?" + params, run.signal);
    if (snapshotsRun !== run) return;
    const branches = Object.entries(snapshot.branches ?? {});
    inspector.replaceChildren(element("p", "swh:1:snp:" + id, "mono"), top);
    if (!branches.length) {
      inspector.append(element("p", "No references were returned for this snapshot."));
      return;
    }
    const table = element("table", undefined, "branch-table");
    const head = element("thead");
    const titles = element("tr");
    for (const name of ["Reference", "Preserved target"]) {
      const cell = element("th", name);
      cell.scope = "col";
      titles.append(cell);
    }
    head.append(titles);
    table.append(head);
    const body = element("tbody");
    for (const [name, branch] of branches.slice(0, 24)) {
      const row = element("tr");
      const target = element("td");
      const url = archiveObject(branch?.target_type, branch?.target);
      if (url) target.append(link(branch.target_type + " " + branch.target.slice(0, 12) + " ↗", url));
      else if (branch?.target_type === "alias") target.append(element("code", branch.target));
      else target.textContent = "Target unavailable";
      row.append(element("td", name, "mono"), target);
      body.append(row);
    }
    table.append(body);
    inspector.append(table);
    const pagination = element("div", undefined, "pagination");
    if (from) pagination.append(button("First references", () => showSnapshot(id)));
    if (typeof snapshot.next_branch === "string" && snapshot.next_branch !== from) {
      pagination.append(button("More references", () => showSnapshot(id, snapshot.next_branch)));
    }
    inspector.append(pagination);
  } catch (error) {
    if (snapshotsRun !== run || run.signal.aborted) return;
    inspector.replaceChildren(element("p", errorText(error), "snapshot-error"), top);
  }
}

get("lookup-form").addEventListener("submit", event => { event.preventDefault(); lookup(query.value); });
for (const preset of document.querySelectorAll("[data-query]")) {
  preset.addEventListener("click", () => { query.value = preset.dataset.query; lookup(query.value); });
}
older.addEventListener("click", loadOlder);
get("share").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareUrl());
    setStatus("Lookup link copied.");
  } catch {
    setStatus("Copy the lookup link from your browser’s address bar.");
  }
});
const initial = new URLSearchParams(location.hash.slice(1));
const initialOrigin = initial.get("origin");
const initialName = initial.get("name");
if (initialOrigin && initialOrigin.length <= 400) { query.value = initialOrigin; find(initialOrigin); }
else if (initialName && initialName.length <= 120) { query.value = initialName; findByName(initialName); }
