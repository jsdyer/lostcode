export const archive = "https://archive.softwareheritage.org";
export const api = archive + "/api/1/";

const providers = new Set(["github.com", "codeberg.org", "bitbucket.org"]);

export function looksLikeOrigin(value) {
  return /^[a-z][a-z\d+.-]*:|^[^\s/]+\.[^\s/]+\//i.test(value);
}

export function nameEndpoint(value) {
  if (value.length < 2 || value.length > 120 || !/[\p{L}\p{N}]/u.test(value)) {
    throw new Error("Enter 2 to 120 characters from a project name or repository path.");
  }
  return api + "origin/search/" + encodeURIComponent(value) + "/?limit=8";
}

export function nameRows(data) {
  if (!Array.isArray(data)) throw new Error("Software Heritage returned an unexpected search response.");
  return data.filter(row => {
    if (typeof row?.url !== "string" || !/^https?:\/\//i.test(row.url)) return false;
    try { return originCandidates(row.url).length > 0; } catch { return false; }
  });
}

export function originCandidates(raw) {
  const input = raw.trim();
  if (!input) throw new Error("Enter the original repository URL.");
  let url;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:/i.test(input) ? input : "https://" + input);
  } catch {
    throw new Error("Enter a valid HTTP or HTTPS repository URL.");
  }
  if (!["https:", "http:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password || url.search || url.hash) {
    throw new Error("Enter a public repository URL without credentials, a query, or a fragment.");
  }
  const path = url.pathname.replace(/\/+$/, "");
  const parts = path.split("/").filter(Boolean);
  if (!parts.length) throw new Error("Include the repository path after the domain.");
  const homePath = providers.has(url.hostname) && parts.length >= 2 ? "/" + parts.slice(0, 2).join("/") : path;
  const clean = url.origin + homePath;
  if (providers.has(url.hostname) && clean.endsWith(".git")) return [clean.slice(0, -4), clean];
  if (providers.has(url.hostname) && !clean.endsWith(".git")) return [clean, clean + ".git"];
  return [clean];
}

export const validHash = value => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);

export function originEndpoint(value, suffix, params = {}) {
  // Raw slashes preserve repository paths on the documented origin endpoint.
  const encoded = encodeURI(value).replace(/%25([\da-f]{2})/gi, "%$1");
  const query = new URLSearchParams(params).toString();
  return api + "origin/" + encoded + "/" + suffix + "/" + (query ? "?" + query : "");
}

export function visitRows(data) {
  if (!Array.isArray(data)) throw new Error("Software Heritage returned an unexpected visits response.");
  return data.filter(row => row && Number.isInteger(row.visit) && row.visit >= 0);
}

export function officialOrigin(url) {
  return archive + "/browse/origin/?" + new URLSearchParams({ origin_url: url }).toString();
}

export function archiveObject(type, id) {
  return ["snapshot", "revision", "release", "directory", "content"].includes(type) && validHash(id)
    ? archive + "/browse/" + type + "/" + (type === "content" ? "sha1_git:" : "") + id + "/"
    : null;
}

export function displayDate(raw) {
  const stamp = new Date(raw);
  return raw && !Number.isNaN(stamp.getTime())
    ? new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(stamp) + " UTC"
    : "Date unavailable";
}
