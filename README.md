# Lost Code

Find preserved source-code snapshots by repository URL, project name or partial repository path. Try MintChip by name, or open the archive history of Linux, PHP or DOOM directly. Select a crawl visit to inspect that snapshot's branches and tags. The official archive links open the preserved objects themselves.

The application runs entirely in the browser and fetches public origin, visit, and snapshot metadata from the Software Heritage API. Name search matches text in archived origin URLs and shows a page of up to eight candidate URLs. The first visit page shows up to 12 results, and additional pages are available up to 120 visits per view. Software Heritage provides the full search and archive views. Snapshot reference pages load when requested.

Visits are archive observations, and snapshot dates refer to capture activity. A missing origin or snapshot does not settle whether the code survives elsewhere. Some origins were partially captured, and some archive URLs are recorded under a different spelling or canonical host.

## Build

Run `python3 scripts/build.py` and serve the resulting `dist/` directory over HTTP. For example, run `python3 -m http.server --directory dist 8000`. Site assets use relative paths for GitHub Pages project subdirectories.

The site sends submitted queries and URLs to Software Heritage. Use public repository URLs without credentials or tokens.

## Sources

- [Software Heritage](https://www.softwareheritage.org/)
- [Software Heritage API](https://archive.softwareheritage.org/api/1/)
- [Software Heritage origin search API](https://archive.softwareheritage.org/api/1/origin/search/doc/)
- [Software Heritage archive FAQ](https://www.softwareheritage.org/software-heritage-faq/)
