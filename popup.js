const DEFAULTS = {
  apiKey: "",
  enabled: true,
  threshold: 0.70,
  mode: "remove",
  toast: true,
  animate: true
};

const $ = (id) => document.getElementById(id);


// --------------------------------------------------
// Get active tab
// --------------------------------------------------

async function activeTab() {

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  return tab;
}


// --------------------------------------------------
// Load statistics
// --------------------------------------------------

async function loadStats() {

  const {
    totalBlocked = 0
  } = await chrome.storage.local.get({
    totalBlocked: 0
  });

  $("statTotal").textContent = totalBlocked;


  const tab = await activeTab();

  if (!tab?.id) {
    return;
  }


  try {

    const stats =
      await chrome.tabs.sendMessage(
        tab.id,
        {
          type: "getStats"
        }
      );


    $("statPage").textContent =
      stats?.removedOnPage ?? 0;


    if (stats?.lastError) {

      $("pageError").textContent =
        `Error: ${stats.lastError}`;

      $("pageError").className =
        "hint error";

    } else {

      $("pageError").textContent = "";
      $("pageError").className = "hint";

    }

  } catch {

    $("pageError").textContent =
      "Not active on this page.";

    $("pageError").className =
      "hint";
  }
}


// --------------------------------------------------
// Load settings
// --------------------------------------------------

async function init() {

  const settings =
    await chrome.storage.sync.get(
      DEFAULTS
    );


  $("enabled").checked =
    settings.enabled;

  $("apiKey").value =
    settings.apiKey;

  $("threshold").value =
    settings.threshold;

  $("thresholdValue").textContent =
    Number(settings.threshold).toFixed(2);

  $("mode").value =
    settings.mode;

  $("toast").checked =
    settings.toast;

  $("animate").checked =
    settings.animate;


  if (!settings.apiKey) {

    $("keyStatus").textContent =
      "Enter your Jev API key.";

    $("keyStatus").className =
      "hint error";
  }


  await loadStats();
}


// --------------------------------------------------
// Protection toggle
// --------------------------------------------------

$("enabled").addEventListener(
  "change",
  (event) => {

    chrome.storage.sync.set({
      enabled: event.target.checked
    });

  }
);


// --------------------------------------------------
// Mode
// --------------------------------------------------

$("mode").addEventListener(
  "change",
  (event) => {

    chrome.storage.sync.set({
      mode: event.target.value
    });

  }
);


// --------------------------------------------------
// Toast
// --------------------------------------------------

$("toast").addEventListener(
  "change",
  (event) => {

    chrome.storage.sync.set({
      toast: event.target.checked
    });

  }
);


// --------------------------------------------------
// Animation
// --------------------------------------------------

$("animate").addEventListener(
  "change",
  (event) => {

    chrome.storage.sync.set({
      animate: event.target.checked
    });

  }
);


// --------------------------------------------------
// Threshold display
// --------------------------------------------------

$("threshold").addEventListener(
  "input",
  (event) => {

    $("thresholdValue").textContent =
      Number(event.target.value).toFixed(2);

  }
);


// --------------------------------------------------
// Save threshold
// --------------------------------------------------

$("threshold").addEventListener(
  "change",
  (event) => {

    chrome.storage.sync.set({
      threshold:
        Number(event.target.value)
    });

  }
);


// --------------------------------------------------
// Save API key
// --------------------------------------------------

let keyTimer = null;

$("apiKey").addEventListener(
  "input",
  (event) => {

    clearTimeout(keyTimer);

    const apiKey =
      event.target.value.trim();


    keyTimer = setTimeout(
      () => {

        chrome.storage.sync.set({
          apiKey
        });


        $("keyStatus").textContent =
          apiKey
            ? "Saved."
            : "Enter your Jev API key.";

        $("keyStatus").className =
          apiKey
            ? "hint ok"
            : "hint error";

      },
      300
    );

  }
);


// --------------------------------------------------
// Test API key
// --------------------------------------------------

$("testKey").addEventListener(
  "click",
  async () => {

    $("keyStatus").textContent =
      "Checking...";

    $("keyStatus").className =
      "hint";


    try {

      const response =
        await chrome.runtime.sendMessage({
          type: "testKey"
        });


      if (response?.error) {

        $("keyStatus").textContent =
          `Error: ${response.error}`;

        $("keyStatus").className =
          "hint error";

        return;
      }


      $("keyStatus").textContent =
        `OK – models: ${
          response.models?.join(", ") || "Jev"
        }`;

      $("keyStatus").className =
        "hint ok";

    } catch (error) {

      $("keyStatus").textContent =
        `Error: ${error.message}`;

      $("keyStatus").className =
        "hint error";
    }

  }
);


// --------------------------------------------------
// Rescan
// --------------------------------------------------

$("rescan").addEventListener(
  "click",
  async () => {

    const tab = await activeTab();

    if (!tab?.id) {
      return;
    }


    try {

      await chrome.tabs.sendMessage(
        tab.id,
        {
          type: "JEV_RESCAN"
        }
      );


      setTimeout(
        loadStats,
        1500
      );

    } catch {

      $("pageError").textContent =
        "Not active on this page.";

    }

  }
);


init();