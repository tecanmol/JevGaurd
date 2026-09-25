# JevGuard

JevGuard is a browser extension that detects and removes ads from webpages using Jev semantic classification.

Instead of relying only on fixed ad-blocking rules, JevGuard looks for elements on a page that resemble ads, builds a short description of each one, and sends those descriptions to Jev for classification. Anything that scores above the threshold you set can be removed or highlighted.

## Features

- Ad detection powered by Jev, not just static rule lists
- Batches up to 30 candidates per request
- Configurable detection threshold
- Remove mode and highlight mode
- Picks up ads that load dynamically or appear while scrolling
- Avoids re-classifying the same element twice
- Retries temporary API failures with backoff
- Optional notifications and removal animation
- Per-page and total counts of blocked ads
- Test button for checking your API key
- Enable/disable the extension and rescan the page from the popup

## How it works

1. The content script scans the page for elements that look like ads (class names, ad-network links, iframes, data attributes, layout patterns, etc.).
2. Each candidate gets turned into a compact description rather than sending the whole page.
3. The descriptions are sent to Jev, which returns a probability that each one is an ad.
4. Anything at or above your configured threshold gets removed or highlighted, depending on the mode you've chosen.

## Requirements

- Google Chrome, Microsoft Edge, or another Chromium-based browser
- A valid TypeSafe/Jev API key
- An internet connection, since classification happens via the Jev API

## Installation

JevGuard isn't on the Chrome Web Store or Edge Add-ons yet, so for now it's installed manually from source.

1. Clone the repo, or download it as a ZIP and extract it:

   ```bash
   git clone https://github.com/tecanmol/JevGaurd.git
   ```

2. Open your browser's extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

3. Turn on Developer mode.
4. Click "Load unpacked" and select the JevGuard folder (the one containing `manifest.json`).
5. Pin JevGuard to your toolbar from the extensions menu.

## Configuration

Everything is set from the popup:

- **API key** – enter your Jev/TypeSafe key and use Test to confirm it works.
- **Detection threshold** – e.g. 0.70 means an element needs at least a 70% probability to be acted on.
- **Mode** – Remove deletes detected ads from the page; Highlight just marks them visually.
- **Animation** – toggle the removal animation.
- **Notifications** – toggle toast notifications.
- **Rescan** – manually re-scan the current page.

## Project structure

```text
JevGuard/
├── manifest.json
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── background.js
    ├── content.js
    ├── popup.html
    ├── popup.css
    └── popup.js
```

## Handling dynamic content

Pages often load content after the initial render, so JevGuard also watches for elements added later and re-scans as needed, including while the user scrolls.

## API errors and retries

Rate limits, server errors, and network hiccups are retried automatically with increasing delays. Permanent errors are not retried.

## Privacy

JevGuard only sends compact descriptions of candidate elements to the Jev API, not the full page. Read the privacy details and the TypeSafe/Jev API terms before using it.

## Permissions

JevGuard needs permissions to read page content (to find candidates), modify the page (to remove or highlight elements), talk to the Jev API, and run its popup and background service worker.

## Development

```bash
git clone https://github.com/tecanmol/JevGaurd.git
cd JevGaurd
```

Load it as an unpacked extension via `chrome://extensions/` or `edge://extensions/` with Developer mode on. After making changes, go back to the extensions page, click Reload on JevGuard, and refresh the page you're testing on.

## Publishing

To publish, package the extension as a ZIP with `manifest.json` at the root:

```text
JevGuard.zip
├── manifest.json
├── icons/
└── src/
```

Leave out `node_modules/`, `.git/`, and `.env`. From there it can be submitted to the Chrome Web Store and/or Microsoft Edge Add-ons.

## License

Add your preferred license here before publishing the project.

## Author

Anmol Pandey — [github.com/tecanmol](https://github.com/tecanmol)

## Disclaimer

JevGuard relies on probabilistic classification, so it will occasionally miss ads or flag things that aren't ads. The threshold and mode you choose determine how aggressively it acts.