// JevGuard - Candidate Selection
// Based on the candidate-discovery approach in the reference project.

(() => {
  const OWN_ATTR = "data-jevguard";

  // --------------------------------------------------
  // 1. Advertising tokens
  // --------------------------------------------------

  const AD_TOKEN =
    /^(ad|ads|adv|advert|adverts|advertisement|advertisements|advertising|adsense|adslot|adunit|adbox|adwrap|adwrapper|adcontainer|adplaceholder|sponsor|sponsors|sponsored|sponsoring|sponsorship|promo|promos|promoted|promotion|banner|banners|billboard|leaderboard|skyscraper|mpu|dfp|gpt|taboola|outbrain|mgid|revcontent|commercial|affiliate|anzeige|anzeigen|werbung|reklame|teads|criteo|prebid|adnxs|doubleclick)$/i;


  // --------------------------------------------------
  // 2. Advertising labels
  // --------------------------------------------------

  const LABEL_RE =
    /^(sponsored( content| post| link| story| by .{1,40})?|advertisement|advertisements|advertising|ad|ads|promoted|paid partnership|paid post|paid content|anzeige|anzeigen|-\s*anzeige\s*-|werbung|gesponsert|reklame|publicité|publicidad|pubblicità|advertentie|annons|reklama)$/i;


  // --------------------------------------------------
  // 3. Known advertising networks
  // --------------------------------------------------

  const AD_HOSTS = [
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "adservice.google",
    "google.com/aclk",
    "taboola.com",
    "outbrain.com",
    "amazon-adsystem.com",
    "amzn.to",
    "criteo.com",
    "criteo.net",
    "adnxs.com",
    "mgid.com",
    "teads.tv",
    "rubiconproject.com",
    "pubmatic.com",
    "openx.net",
    "smartadserver.com",
    "yieldlab.net",
    "adform.net",
    "revcontent.com",
    "zemanta.com",
    "awin1.com",
    "shareasale.com",
    "impact.com",
    "impactradius",
    "adsrvr.org",
    "bidswitch.net",
    "moatads.com",
    "adroll.com",
    "media.net",
    "plista.com",
    "ligatus.com",
    "yieldmo.com",
    "sharethrough.com",
    "nativo.com",
    "connatix.com"
  ];


  // --------------------------------------------------
  // 4. Explicit advertising-related selectors
  // --------------------------------------------------

  const ATTR_SELECTOR = [
    "iframe",
    "ins",

    "[data-ad]",
    "[data-ad-slot]",
    "[data-ad-unit]",
    "[data-adunit]",
    "[data-ad-client]",
    "[data-ad-name]",

    "[data-google-query-id]",
    "[data-sponsored]",
    "[data-native-ad]",
    "[data-taboola]",
    "[data-outbrain]",

    "[data-ad-type]",
    "[data-adtype]",
    "[data-freestar-ad]",

    "[data-testid*='ad-' i]",
    "[data-testid*='sponsor' i]",

    "[aria-label*='advert' i]",
    "[aria-label*='sponsor' i]",
    "[aria-label*='anzeige' i]",
    "[aria-label*='werbung' i]",

    "a[href*='doubleclick.net']",
    "a[href*='googleadservices']",
    "a[href*='/aclk?']",
    "a[href*='taboola.com']",
    "a[href*='outbrain.com']",
    "a[href*='amzn.to/']",
    "a[href*='awin1.com']",
    "a[href*='shareasale.com']",
    "a[href*='mgid.com']",
    "a[href*='revcontent.com']"
  ].join(",");


  // --------------------------------------------------
  // 5. Elements that should stop container climbing
  // --------------------------------------------------

  const STOP_TAGS = new Set([
    "BODY",
    "HTML",
    "MAIN",
    "NAV",
    "HEADER",
    "FOOTER",
    "UL",
    "OL",
    "TABLE",
    "FORM"
  ]);


  // Elements that should never become candidates
  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEMPLATE",
    "HEAD",
    "META",
    "LINK",
    "TITLE",
    "SVG",
    "PATH"
  ]);


  // --------------------------------------------------
  // 6. Standard advertising dimensions
  // --------------------------------------------------

  const STANDARD_SIZES = new Set([
    "300x250",
    "728x90",
    "320x50",
    "160x600",
    "300x600",
    "970x250",
    "336x280",
    "320x100",
    "970x90",
    "250x250",
    "200x200",
    "468x60",
    "120x600",
    "300x50",
    "300x100",
    "980x120",
    "980x90",
    "800x250",
    "640x480"
  ]);


  // --------------------------------------------------
  // 7. Convert IDs/classes into individual tokens
  // --------------------------------------------------

  function tokenize(value) {
    return String(value || "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .split(/[^A-Za-z]+/)
      .filter(Boolean);
  }


  // --------------------------------------------------
  // 8. Check whether ID/class contains an ad token
  // --------------------------------------------------

  function hasAdToken(element) {
    const idTokens = tokenize(element.id);

    const classTokens = tokenize(
      element.className?.baseVal ?? element.className
    );

    const tokens = idTokens.concat(classTokens);

    return tokens.some(token => AD_TOKEN.test(token));
  }


  // --------------------------------------------------
  // 9. Calculate element area
  // --------------------------------------------------

  function area(element) {
    const rect = element.getBoundingClientRect();

    return Math.max(0, rect.width) *
           Math.max(0, rect.height);
  }


  // --------------------------------------------------
  // 10. Calculate viewport area
  // --------------------------------------------------

  function viewportArea() {
    const width =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      0;

    const height =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      0;

    return Math.max(width * height, 800 * 600);
  }


  // --------------------------------------------------
  // 11. Check whether element is visible
  // --------------------------------------------------

  function isVisible(element) {

    if (!element.isConnected) {
      return false;
    }

    const rect = element.getBoundingClientRect();

    if (rect.width < 8 || rect.height < 8) {
      return false;
    }

    const style = getComputedStyle(element);

    return (
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  }


  // --------------------------------------------------
  // 12. Ignore JevGuard's own UI
  // --------------------------------------------------

  function isOurs(element) {
    return !!element.closest?.(`[${OWN_ATTR}]`);
  }


  // --------------------------------------------------
  // 13. Collapse small wrappers around ad elements
  // --------------------------------------------------

  function collapseWrapper(element) {

    let current = element;

    for (let i = 0; i < 4; i++) {

      const parent = current.parentElement;

      if (!parent) {
        break;
      }

      if (STOP_TAGS.has(parent.tagName)) {
        break;
      }

      const currentArea = area(current);
      const parentArea = area(parent);

      if (
        parentArea >
        Math.max(currentArea * 1.4, currentArea + 4000)
      ) {
        break;
      }

      if (parent.children.length > 3) {
        break;
      }

      current = parent;
    }

    return current;
  }


  // --------------------------------------------------
  // 14. Find the actual container around a label
  // --------------------------------------------------

  function labelContainer(labelElement) {

    const viewport = viewportArea();

    let current = labelElement;
    let best = labelElement;

    for (let i = 0; i < 8; i++) {

      const parent = current.parentElement;

      if (!parent) {
        break;
      }

      if (STOP_TAGS.has(parent.tagName)) {
        break;
      }

      if (area(parent) > viewport * 0.35) {
        break;
      }

      if ((parent.textContent || "").length > 1500) {
        break;
      }

      if (findLabelElements(parent).length > 1) {
        break;
      }

      if (parent.querySelector("h1, main")) {
        break;
      }

      current = parent;
      best = parent;
    }

    return best;
  }


  // --------------------------------------------------
  // 15. Check whether an element is acceptable
  // --------------------------------------------------

  function acceptable(element, judged) {

    if (!element) {
      return false;
    }

    if (
      element === document.body ||
      element === document.documentElement
    ) {
      return false;
    }

    if (SKIP_TAGS.has(element.tagName)) {
      return false;
    }

    if (isOurs(element)) {
      return false;
    }

    if (judged.has(element)) {
      return false;
    }

    if (!isVisible(element)) {
      return false;
    }

    if (element.tagName !== "IFRAME") {

      if (area(element) > viewportArea() * 0.5) {
        return false;
      }

      if ((element.textContent || "").length > 2000) {
        return false;
      }

      if (element.querySelector("main, h1")) {
        return false;
      }
    }

    return true;
  }


  // --------------------------------------------------
  // 16. Find advertising labels inside an element
  // --------------------------------------------------

  function findLabelElements(root) {

    const results = [];

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {

          const text = node.nodeValue.trim();

          if (
            text.length < 2 ||
            text.length > 40 ||
            !LABEL_RE.test(text)
          ) {
            return NodeFilter.FILTER_SKIP;
          }

          const parent = node.parentElement;

          if (
            !parent ||
            SKIP_TAGS.has(parent.tagName) ||
            isOurs(parent)
          ) {
            return NodeFilter.FILTER_SKIP;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;

    while ((node = walker.nextNode())) {
      results.push(node.parentElement);
    }

    return results;
  }


  // --------------------------------------------------
  // 17. MAIN CANDIDATE COLLECTION FUNCTION
  // --------------------------------------------------

  function collectCandidates(root = document.body, judged = new WeakSet()) {

    const rawCandidates = new Set();

    const scope =
      root.nodeType === Node.ELEMENT_NODE
        ? root
        : document.body;

    if (!scope) {
      return [];
    }


    // A. Explicit ad-related selectors

    if (scope.matches?.(ATTR_SELECTOR)) {
      rawCandidates.add(scope);
    }

    scope
      .querySelectorAll(ATTR_SELECTOR)
      .forEach(element => {
        rawCandidates.add(element);
      });


    // B. ID/class scanning

    const elementsWithIdentifiers =
      scope.querySelectorAll("[id],[class]");

    for (const element of elementsWithIdentifiers) {

      if (hasAdToken(element)) {
        rawCandidates.add(element);
      }
    }

    if (
      scope !== document.body &&
      hasAdToken(scope)
    ) {
      rawCandidates.add(scope);
    }


    // C. Advertising labels

    const labels = findLabelElements(scope);

    for (const label of labels) {

      rawCandidates.add(
        labelContainer(label)
      );
    }


    // D. Resolve candidates to useful containers

    const resolvedCandidates = new Set();

    for (const element of rawCandidates) {

      const target =
        element.tagName === "A"
          ? labelContainer(element)
          : collapseWrapper(element);

      if (
        acceptable(target, judged)
      ) {
        resolvedCandidates.add(target);
      }
    }


    // E. Remove redundant nested candidates

    const candidates =
      [...resolvedCandidates];

    return candidates
      .filter(element => {

        const outer =
          candidates.find(
            other =>
              other !== element &&
              other.contains(element)
          );

        if (!outer) {
          return true;
        }

        return (
          area(outer) >
          area(element) * 2
        );
      })

      .filter(element => {

        const inner =
          candidates.find(
            other =>
              other !== element &&
              element.contains(other)
          );

        if (!inner) {
          return true;
        }

        return !(
          area(element) >
          area(inner) * 2
        );
      });
  }

// --------------------------------------------------
// Candidate description helpers
// --------------------------------------------------

function shapeName(width, height) {
  const ratio = width / Math.max(1, height);

  if (width < 120 && height < 120) {
    return "small badge";
  }

  if (ratio >= 3) {
    return "wide horizontal banner";
  }

  if (ratio <= 1 / 3) {
    return "tall vertical column";
  }

  if (Math.abs(ratio - 1) < 0.25) {
    return "square box";
  }

  if (width * height > viewportArea() * 0.25) {
    return "large block";
  }

  return "medium rectangle";
}


function hostOf(url) {
  try {
    return new URL(
      url,
      location.href
    ).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}


function knownNetwork(hosts, element) {

  const attributes = [
    ...element.attributes
  ]
    .map(
      attribute =>
        attribute.name +
        "=" +
        attribute.value
    )
    .join(" ");

  const source =
    hosts.join(" ") +
    " " +
    (element.getAttribute("src") || "") +
    " " +
    attributes;

  return AD_HOSTS.find(
    host => source.includes(host)
  );
}


// --------------------------------------------------
// Build compact candidate description
// --------------------------------------------------

function describe(element) {

  const rect =
    element.getBoundingClientRect();

  const width =
    Math.round(rect.width);

  const height =
    Math.round(rect.height);

  const pageHost =
    location.hostname.replace(
      /^www\./,
      ""
    );


  // ----------------------------------------------
  // Find link hosts
  // ----------------------------------------------

  const linkHosts = [];

  const anchors =
    element.tagName === "A"
      ? [element]
      : [
          ...element.querySelectorAll(
            "a[href]"
          )
        ];

  for (const anchor of anchors) {

    const host =
      hostOf(
        anchor.getAttribute("href")
      );

    if (
      host &&
      !linkHosts.includes(host)
    ) {
      linkHosts.push(host);
    }

    if (linkHosts.length >= 6) {
      break;
    }
  }


  // ----------------------------------------------
  // Find iframe source
  // ----------------------------------------------

  const iframeSrc =
    element.tagName === "IFRAME"
      ? element.getAttribute("src") || ""
      : element
          .querySelector(
            "iframe[src]"
          )
          ?.getAttribute("src") || "";

  const iframeHost =
    iframeSrc
      ? hostOf(iframeSrc)
      : undefined;


  // ----------------------------------------------
  // Extract visible text
  // ----------------------------------------------

  const text =
    (
      element.innerText ||
      element.getAttribute("title") ||
      ""
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);


  // ----------------------------------------------
  // Find advertising label
  // ----------------------------------------------

  const label =
    findLabelElements(element)
      .map(
        item =>
          item.textContent.trim()
      )
      .find(Boolean);


  // ----------------------------------------------
  // Extract image alt text
  // ----------------------------------------------

  const imageAlts =
    [
      ...element.querySelectorAll(
        "img[alt]"
      )
    ]
      .map(
        image =>
          image
            .getAttribute("alt")
            .trim()
      )
      .filter(Boolean)
      .slice(0, 3);


  // ----------------------------------------------
  // Extract data-* attributes
  // ----------------------------------------------

  const dataAttributes =
    [
      ...element.attributes
    ]
      .map(
        attribute =>
          attribute.name
      )
      .filter(
        name =>
          name.startsWith("data-")
      )
      .slice(0, 8);


  // ----------------------------------------------
  // Extract CSS classes
  // ----------------------------------------------

  const classes =
    tokenize(
      element.className?.baseVal ??
      element.className
    )
      .slice(0, 8)
      .join(" ");


  // ----------------------------------------------
  // Build host list
  // ----------------------------------------------

  const allHosts =
    linkHosts.concat(
      iframeHost
        ? [iframeHost]
        : []
    );


  // ----------------------------------------------
  // Build compact candidate object
  // ----------------------------------------------

  const candidate = {

    tag:
      element.tagName
        .toLowerCase(),

    id:
      element.id ||
      undefined,

    classes:
      classes ||
      undefined,

    role:
      element.getAttribute(
        "role"
      ) ||
      undefined,

    aria_label:
      element.getAttribute(
        "aria-label"
      ) ||
      undefined,

    shape:
      shapeName(
        width,
        height
      ),

    standard_ad_size:
      STANDARD_SIZES.has(
        `${width}x${height}`
      ) ||
      undefined,

    label:
      label ||
      undefined,

    text:
      text ||
      undefined,

    link_hosts:
      linkHosts.length
        ? linkHosts
        : undefined,

    links_to_other_sites:
      linkHosts.some(
        host =>
          host !== pageHost &&
          !host.endsWith(
            "." + pageHost
          )
      ) ||
      undefined,

    iframe_src_host:
      iframeHost ||
      undefined,

    image_alts:
      imageAlts.length
        ? imageAlts
        : undefined,

    data_attributes:
      dataAttributes.length
        ? dataAttributes
        : undefined,

    known_ad_network:
      knownNetwork(
        allHosts,
        element
      ) ||
      undefined
  };


  // ----------------------------------------------
  // Remove undefined fields
  // ----------------------------------------------

  for (
    const key of Object.keys(candidate)
  ) {
    if (
      candidate[key] === undefined
    ) {
      delete candidate[key];
    }
  }


  return candidate;
}
  
// --------------------------------------------------
// 18. JevGuard runtime controller
// --------------------------------------------------

const MAX_PER_BATCH = 30;
const DEBOUNCE_MS = 600;
let removedOnPage = 0;
let lastError = null;

const DEFAULT_SETTINGS = {
  enabled: true,
  threshold: 0.70,
  mode: "remove",
  toast: true,
  animate: true
};

let settings = {
  ...DEFAULT_SETTINGS
};

// Elements already judged by Jev
let judged = new WeakSet();
let inFlight = new WeakSet();

// Candidates waiting to be sent to Jev
const pending = new Set();

// Prevent multiple Jev requests at the same time
let busy = false;

// Debounce timer
let scanTimer = null;

// Periodic safety scan
let periodicScanTimer = null;

// Scroll scan timer
let scrollTimer = null;


// ==================================================
// Settings
// ==================================================

async function loadSettings() {

  const stored =
    await chrome.storage.sync.get(
      DEFAULT_SETTINGS
    );

  settings = {
    ...DEFAULT_SETTINGS,
    ...stored
  };

  console.log(
    "[JevGuard] Settings loaded:",
    settings
  );

  return settings;
}


// ==================================================
// Stop scanning completely
// ==================================================

function stopScanning() {

  // Cancel pending debounce
  if (scanTimer) {
    clearTimeout(scanTimer);
    scanTimer = null;
  }

  // Stop periodic scans
  if (periodicScanTimer) {
    clearInterval(periodicScanTimer);
    periodicScanTimer = null;
  }

  // Cancel scroll scan
  if (scrollTimer) {
    clearTimeout(scrollTimer);
    scrollTimer = null;
  }

  // Remove anything waiting for Jev
  pending.clear();

  console.log(
    "[JevGuard] Protection OFF — scanning stopped."
  );
}


// ==================================================
// Queue candidates
// ==================================================

function queueCandidates(elements) {

  // HARD STOP
  // Never queue anything while disabled.

  if (!settings.enabled) {
    return;
  }

  for (const element of elements) {

    if (!element) {
      continue;
    }

    if (!element.isConnected) {
      continue;
    }

    if (isOurs(element)) {
      continue;
    }

    if (judged.has(element) || inFlight.has(element)) {
      continue;
    }

    pending.add(element);
  }

  if (pending.size > 0) {
    scheduleBatch();
  }
}


// ==================================================
// Schedule Jev request
// ==================================================

function scheduleBatch() {

  // HARD STOP

  if (!settings.enabled) {
    return;
  }

  if (scanTimer) {
    clearTimeout(scanTimer);
  }

  scanTimer = setTimeout(
    processBatch,
    DEBOUNCE_MS
  );
}

function popAway(element) {

  const previous = {
    outline: element.style.outline,
    outlineOffset: element.style.outlineOffset,
    transformOrigin: element.style.transformOrigin
  };


  const failSafe = setTimeout(
    () => {

      if (element.isConnected) {
        element.remove();
      }

    },
    2500
  );


  element.style.outline =
    "3px solid #e11d48";

  element.style.outlineOffset =
    "-3px";

  element.style.transformOrigin =
    "center center";


  const pulse = element.animate(
    [
      {
        boxShadow:
          "0 0 0 0 rgba(225,29,72,.75)",
        outlineColor:
          "#e11d48"
      },

      {
        boxShadow:
          "0 0 0 14px rgba(225,29,72,0)",
        outlineColor:
          "#fb7185"
      }
    ],
    {
      duration: 450,
      iterations: 2,
      easing: "ease-out"
    }
  );


  pulse.finished
    .catch(() => {})
    .then(() => {

      if (!element.isConnected) {
        return;
      }


      const pop = element.animate(
        [
          {
            transform: "scale(1)",
            opacity: 1
          },

          {
            transform: "scale(1.08)",
            opacity: 1,
            offset: 0.3
          },

          {
            transform: "scale(0)",
            opacity: 0
          }
        ],
        {
          duration: 320,
          easing:
            "cubic-bezier(.5,0,.9,.4)",
          fill: "forwards"
        }
      );


      return pop.finished
        .catch(() => {});

    })
    .then(() => {

      clearTimeout(failSafe);


      if (element.isConnected) {
        element.remove();
      }


      Object.assign(
        element.style,
        previous
      );

    });
}

function showToast(message) {

  if (!settings.toast) {
    return;
  }


  const existing =
    document.querySelector(
      `[${OWN_ATTR}="toast"]`
    );

  if (existing) {
    existing.remove();
  }


  const toast =
    document.createElement("div");

  toast.setAttribute(
    OWN_ATTR,
    "toast"
  );


  toast.textContent =
    message;


  Object.assign(
    toast.style,
    {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      zIndex: "2147483647",
      padding: "10px 14px",
      borderRadius: "8px",
      background: "#111827",
      color: "#fff",
      font:
        "13px system-ui, sans-serif",
      boxShadow:
        "0 4px 20px rgba(0,0,0,.25)",
      opacity: "0",
      transform: "translateY(8px)",
      transition:
        "opacity .2s, transform .2s"
    }
  );


  document.body.appendChild(toast);


  requestAnimationFrame(() => {

    toast.style.opacity = "1";
    toast.style.transform =
      "translateY(0)";

  });


  setTimeout(() => {

    toast.style.opacity = "0";
    toast.style.transform =
      "translateY(8px)";

    setTimeout(
      () => toast.remove(),
      250
    );

  }, 2500);
}

// ==================================================
// Process one Jev batch
// ==================================================

async function processBatch() {

  scanTimer = null;

  // ----------------------------------------------
  // Protection could have been disabled while
  // the debounce timer was waiting.
  // ----------------------------------------------

  if (!settings.enabled) {

    pending.clear();

    return;
  }


  // ----------------------------------------------
  // Don't run two API requests simultaneously.
  // ----------------------------------------------

  if (busy) {

    if (pending.size > 0) {
      scheduleBatch();
    }

    return;
  }


  // ----------------------------------------------
  // Nothing to process
  // ----------------------------------------------

  if (pending.size === 0) {
    return;
  }


  busy = true;


  try {

    // --------------------------------------------
    // Take maximum 30 candidates
    // --------------------------------------------

    const batch = [];

    for (const element of pending) {

      pending.delete(element);

      // Element may have disappeared while waiting
      if (!element.isConnected) {
        continue;
      }

      // It may have been judged already
      if (judged.has(element)) {
        continue;
      }

      batch.push(element);

      if (batch.length >= MAX_PER_BATCH) {
        break;
      }
    }


    if (batch.length === 0) {
      return;
    }


    // --------------------------------------------
    // Mark as judged
    // --------------------------------------------

   

    console.log(
      "[JevGuard] Sending batch:",
      batch.length
    );


    // --------------------------------------------
    // Build compact descriptions
    // --------------------------------------------

    const candidates =
      batch.map(element => describe(element));


    // --------------------------------------------
    // Page information
    // --------------------------------------------

    const page = {
      hostname: location.hostname,
      title: document.title
    };


    // --------------------------------------------
    // Ask background service worker
    // --------------------------------------------

    for (const element of batch) {
      inFlight.add(element);
    }

    const response =
      await chrome.runtime.sendMessage({
        type: "JEV_CHECK_ADS",
        page,
        candidates
      });


    // --------------------------------------------
    // Check response
    // --------------------------------------------

    if (!response) {
    console.error(
        "[JevGuard] No response from background."
    );

    for (const el of batch) {
        inFlight.delete(el);
    }

    return;
}

if (!response.success) {
    console.error(
        "[JevGuard] Jev error:",
        response.error
    );

    lastError = response.error || "Jev request failed";

    for (const el of batch) {
        inFlight.delete(el);
    }

    return;
}


    const probabilities =
      response.result?.probabilities || [];


    console.log(
      "[JevGuard] Jev probabilities:",
      probabilities
    );


    // --------------------------------------------
    // Protection may have been disabled while
    // the API request was running.
    // --------------------------------------------

    if (!settings.enabled) {

      console.log(
        "[JevGuard] Protection disabled during Jev request."
      );

      return;
    }

    for (const el of batch) {
        judged.add(el);
        inFlight.delete(el);
    }

    // --------------------------------------------
    // Apply Jev decisions
    // --------------------------------------------

    let hits = 0;

probabilities.forEach(
  (probability, index) => {

    const element = batch[index];

    if (!element) {
      return;
    }

    if (!element.isConnected) {
      return;
    }

    console.log(
      `[JevGuard] Candidate ${index}: P(ad) = ` +
      probability.toFixed(3),
      element
    );

    // ----------------------------------------
    // Advertisement detected
    // ----------------------------------------

    if (probability >= settings.threshold) {

      hits++;

      console.log(
        `🚨 [JevGuard] AD detected ` +
        `P(ad)=${probability.toFixed(3)}`,
        element
      );

      // --------------------------------------
      // Remove
      // --------------------------------------

      if (settings.mode === "remove") {

        if (
          settings.animate &&
          document.visibilityState === "visible"
        ) {

          popAway(element);

        } else {

          element.remove();

        }

      }

      // --------------------------------------
      // Highlight
      // --------------------------------------

      else if (settings.mode === "highlight") {

        element.style.outline =
          "3px solid #e11d48";

        element.style.outlineOffset =
          "-3px";

        element.style.background =
          "rgba(225, 29, 72, 0.15)";
      }

    }

    // ----------------------------------------
    // Not an advertisement
    // ----------------------------------------

    else {

      console.log(
        `✓ [JevGuard] Content ` +
        `P(ad)=${probability.toFixed(3)}`,
        element
      );

    }

  }
);


// ----------------------------------------------
// Update statistics
// ----------------------------------------------

if (hits > 0) {

  removedOnPage += hits;

  chrome.runtime.sendMessage({
    type: "blocked",
    count: hits
  }).catch(() => {});

  showToast(
    `🧹 ${hits} ad${
      hits === 1 ? "" : "s"
    } ${
      settings.mode === "highlight"
        ? "flagged"
        : "removed"
    }`
  );

}

  } catch (error) {
    console.error(
        "[JevGuard] Batch error:",
        error
    );

    lastError =
        error?.message ||
        String(error);

    for (const el of batch) {
        inFlight.delete(el);
    }
} finally {

    busy = false;


    // --------------------------------------------
    // Process remaining candidates
    // --------------------------------------------

    if (
      settings.enabled &&
      pending.size > 0
    ) {

      scheduleBatch();
    }
  }
}



// ================================================
// Scan page
// ==================================================

function scanPage() {

  // HARD STOP

  if (!settings.enabled) {
    return;
  }


  if (!document.body) {
    return;
  }


  const candidates =
    collectCandidates(
      document.body,
      judged
    );


  if (candidates.length === 0) {
    return;
  }


  console.log(
    "[JevGuard] Scan found candidates:",
    candidates.length
  );


  queueCandidates(candidates);
}


// ==================================================
// MutationObserver
// ==================================================

const observer =
  new MutationObserver(
    mutations => {

      // --------------------------------------------
      // HARD STOP
      // --------------------------------------------

      if (!settings.enabled) {
        return;
      }


      const discovered =
        new Set();


      for (const mutation of mutations) {


        // ==========================================
        // Newly inserted elements
        // ==========================================

        if (
          mutation.type === "childList"
        ) {

          for (
            const node of mutation.addedNodes
          ) {

            if (
              node.nodeType !==
              Node.ELEMENT_NODE
            ) {
              continue;
            }


            if (isOurs(node)) {
              continue;
            }


            const candidates =
              collectCandidates(
                node,
                judged
              );


            for (
              const candidate of candidates
            ) {

              discovered.add(
                candidate
              );
            }
          }
        }


        // ==========================================
        // Existing element changed
        // ==========================================

        if (
          mutation.type === "attributes"
        ) {

          const element =
            mutation.target;


          if (
            !element ||
            element.nodeType !==
              Node.ELEMENT_NODE
          ) {
            continue;
          }


          if (isOurs(element)) {
            continue;
          }


          const candidates =
            collectCandidates(
              element,
              judged
            );


          for (
            const candidate of candidates
          ) {

            discovered.add(
              candidate
            );
          }
        }
      }


      // ==========================================
      // Queue newly discovered candidates
      // ==========================================

      if (
        discovered.size > 0
      ) {

        console.log(
          "[JevGuard] MutationObserver found:",
          discovered.size
        );


        queueCandidates(
          discovered
        );
      }
    }
  );


// ==================================================
// Start MutationObserver
// ==================================================

function startObserver() {

  if (
    !document.documentElement
  ) {
    return;
  }


  observer.observe(
    document.documentElement,
    {
      childList: true,

      subtree: true,

      attributes: true,

      attributeFilter: [
        "class",
        "id",
        "src",
        "href",
        "style",
        "hidden",
        "aria-label",
        "data-ad",
        "data-ad-slot",
        "data-ad-unit",
        "data-ad-client",
        "data-ad-name",
        "data-sponsored",
        "data-native-ad",
        "data-taboola",
        "data-outbrain",
        "data-ad-type",
        "data-adtype"
      ]
    }
  );


  console.log(
    "[JevGuard] MutationObserver started."
  );
}


// ==================================================
// Scroll detection
// ==================================================

window.addEventListener(
  "scroll",

  () => {

    // HARD STOP

    if (!settings.enabled) {
      return;
    }


    if (scrollTimer) {
      clearTimeout(scrollTimer);
    }


    scrollTimer =
      setTimeout(
        () => {

          if (!settings.enabled) {
            return;
          }

          scanPage();

        },
        400
      );
  },

  {
    passive: true
  }
);


// ==================================================
// Periodic safety scan
// ==================================================
//
// Some ad networks:
//
// 1. create an empty slot
// 2. wait for an auction/network response
// 3. populate it later
//
// MutationObserver does not always give us a useful
// signal for the final ad state.
//
// This scan catches those cases.
//

function startPeriodicScan() {

  if (periodicScanTimer) {
    clearInterval(
      periodicScanTimer
    );
  }


  if (!settings.enabled) {
    return;
  }


  // periodicScanTimer =
  //   setInterval(
  //     () => {

  //       if (!settings.enabled) {
  //         return;
  //       }


  //       console.log(
  //         "[JevGuard] Periodic scan"
  //       );


  //       scanPage();

  //     },

  //     2000
  //   );
}


// ==================================================
// Start JevGuard
// ==================================================

async function startJevGuard() {

  await loadSettings();


  // ----------------------------------------------
  // Protection OFF
  // ----------------------------------------------

  if (!settings.enabled) {

    stopScanning();

    console.log(
      "[JevGuard] Protection is OFF."
    );

    return;
  }


  // ----------------------------------------------
  // Protection ON
  // ----------------------------------------------

  console.log(
    "[JevGuard] Protection is ON."
  );


  startObserver();

  scanPage();

  startPeriodicScan();
}


// ==================================================
// React to popup setting changes
// ==================================================

chrome.storage.onChanged.addListener(
  async (
    changes,
    areaName
  ) => {

    if (
      areaName !== "sync"
    ) {
      return;
    }


    const wasEnabled =
      settings.enabled;


    await loadSettings();


    // ==========================================
    // ON → OFF
    // ==========================================

    if (
      wasEnabled &&
      !settings.enabled
    ) {

      stopScanning();

      return;
    }


    // ==========================================
    // OFF → ON
    // ==========================================

    if (
      !wasEnabled &&
      settings.enabled
    ) {

      console.log(
        "[JevGuard] Protection enabled."
      );


      // Forget previous judgments
      judged = new WeakSet();


      startPeriodicScan();

      scanPage();

      return;
    }


    // ==========================================
    // Threshold changed
    // ==========================================

    if (
      changes.threshold
    ) {

      console.log(
        "[JevGuard] Threshold changed:",
        settings.threshold
      );


      // Re-evaluate existing elements
      judged = new WeakSet();

      pending.clear();

      scanPage();

      return;
    }


    // ==========================================
    // Action changed
    // ==========================================
// ==========================================
// Mode changed
// ==========================================

if (changes.mode) {

  console.log(
    "[JevGuard] Mode changed:",
    settings.mode
  );

  judged = new WeakSet();

  pending.clear();

  scanPage();

  return;
}
  }
);


// ==================================================
// Popup → Content Script
// ==================================================
chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {

    if (message.type === "getStats") {

      sendResponse({
        removedOnPage,
        pending: pending.size,
        lastError
      });

      return false;
    }


   if (message.type === "JEV_RESCAN") {

  console.log(
    "JevGuard: manual rescan requested."
  );


  loadSettings().then(() => {

    if (!settings.enabled) {

      sendResponse({
        success: false,
        disabled: true
      });

      return;
    }


    judged = new WeakSet();

    pending.clear();

    scanPage();


    sendResponse({
      success: true
    });

  });


  return true;
}

  }
);


// ==================================================
// Start
// ==================================================

startJevGuard();

})();