# Lost Code

Find preserved source-code snapshots by known repository URL. Try opening the archive history of Linux, PHP, or DOOM, then select a crawl visit to inspect that snapshot's branches and tags. Use the official archive links to open the preserved objects themselves.

The application runs entirely in the browser and fetches public origin, visit, and snapshot metadata from the Software Heritage API. No credentials or indexed source copies are bundled. The first visit page shows up to 12 results, and additional pages are available up to 120 visits per view; the official origin page has the full archive view. Snapshot reference pages are fetched only when requested. Repository names can be searched on Software Heritage's official search page.

Visits are archive observations, and snapshot dates refer to capture activity. A missing origin or snapshot does not settle whether the code survives elsewhere. Some origins were partially captured, and some archive URLs are recorded under a different spelling or canonical host.

## Build

Run `python3 scripts/build.py` and serve the resulting `dist/` directory over HTTP. For example, run `python3 -m http.server --directory dist 8000`. Site assets use relative paths for GitHub Pages project subdirectories.

The site sends the URL entered for lookup to Software Heritage. Avoid repository URLs with credentials or tokens. Live requests use explicit searches rather than indexing as you type.

## Sources

- [Software Heritage](https://www.softwareheritage.org/)
- [Software Heritage API](https://archive.softwareheritage.org/api/1/)
- [Software Heritage archive FAQ](https://www.softwareheritage.org/software-heritage-faq/)
