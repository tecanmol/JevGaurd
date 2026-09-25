// JevGuard - Background Service Worker
// Handles communication between content.js and Jev.
//
// Flow:
// content.js
//    ↓
// chrome.runtime.sendMessage()
//    ↓
// background.js
//    ↓
// TypeSafe / Jev
//    ↓
// probabilities for each candidate
//


// --------------------------------------------------
// Jev configuration
// --------------------------------------------------

const JEV_ENDPOINT =
  "https://api.typesafe.ai/v1/systemone";

const JEV_MODEL =
  "jev-latest";

const MAX_CANDIDATES_PER_REQUEST = 30;

const MAX_JEV_RETRIES = 3;

const RETRYABLE_STATUS_CODES = new Set([
  429,
  500,
  502,
  503,
  504
]);

const RETRY_DELAYS = [1000, 2000, 4000];


// --------------------------------------------------
// Advertisement criteria
// --------------------------------------------------

const AD_CRITERIA = {

  true:
    "Paid or third-party advertising: an ad-network slot or iframe " +
    "(Google Ads, DoubleClick, AdSense, Taboola, Outbrain, Amazon, Criteo, etc.), " +
    "a placement labeled sponsored, promoted, advertisement, Anzeige, Werbung or gesponsert, " +
    "or an affiliate / product banner promoting a product, service, app, shop, casino, " +
    "or offer that is not the subject of the page itself.",

  false:
    "The website's own content or interface: article or post text, headlines, " +
    "images that belong to the story, navigation, header, footer, search, comments, " +
    "related or recommended articles from the same site, cookie or consent notices, " +
    "login, subscription or newsletter prompts, share buttons, video players that are " +
    "the page's content, or empty layout containers."

};


// --------------------------------------------------
// Badge / statistics
// --------------------------------------------------

const badgeCounts = new Map();


async function setBadge(tabId, count) {

  try {

    await chrome.action.setBadgeBackgroundColor({
      tabId,
      color: "#e11d48"
    });


    await chrome.action.setBadgeText({
      tabId,
      text:
        count > 0
          ? String(count)
          : ""
    });

  } catch {

    // Tab may have been closed.
  }

}


async function addToTotal(count) {

  const {
    totalBlocked = 0
  } = await chrome.storage.local.get({
    totalBlocked: 0
  });


  await chrome.storage.local.set({

    totalBlocked:
      totalBlocked + count

  });

}


// --------------------------------------------------
// Reset badge when a page starts loading
// --------------------------------------------------

chrome.tabs.onUpdated.addListener(
  (tabId, changeInfo) => {

    if (changeInfo.status === "loading") {

      badgeCounts.delete(tabId);

      setBadge(
        tabId,
        0
      );

    }

  }
);


// --------------------------------------------------
// Clean up badge state when tab closes
// --------------------------------------------------

chrome.tabs.onRemoved.addListener(
  (tabId) => {

    badgeCounts.delete(tabId);

  }
);


// --------------------------------------------------
// Message handler
// --------------------------------------------------

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {


    // ==================================================
    // Blocked / flagged ads
    // ==================================================

    if (message.type === "blocked") {

      const tabId =
        sender.tab?.id;


      const count =
        Number(message.count) || 0;


      if (tabId != null) {

        const next =
          (badgeCounts.get(tabId) ?? 0) +
          count;


        badgeCounts.set(
          tabId,
          next
        );


        setBadge(
          tabId,
          next
        );

      }


      if (count > 0) {

        addToTotal(
          count
        );

      }


      sendResponse({

        success: true

      });


      return false;
    }


    // ==================================================
    // Test Jev API key
    // ==================================================

    if (message.type === "testKey") {

      testJevKey()

        .then(result => {

          sendResponse(
            result
          );

        })

        .catch(error => {

          console.error(
            "JevGuard key test error:",
            error
          );


          sendResponse({

            success: false,

            error:
              error.message

          });

        });


      // Keep the message channel open
      // for the asynchronous response.
      return true;
    }


    // ==================================================
    // Check advertisements with Jev
    // ==================================================

    if (message.type === "JEV_CHECK_ADS") {

      console.log(
        "JevGuard received message:",
        message
      );


      checkAdsWithJev(

        message.candidates,

        message.page

      )

        .then(result => {

          console.log(
            "JevGuard Jev result:",
            result
          );


          sendResponse({

            success: true,

            result:
              result

          });

        })

        .catch(error => {

          console.error(
            "JevGuard Jev error:",
            error
          );


          sendResponse({

            success: false,

            error:
              error.message

          });

        });


      // Keep the message channel open
      // for the asynchronous Jev request.
      return true;
    }

  }
);


// --------------------------------------------------
// Test Jev API key
// --------------------------------------------------

async function testJevKey() {


  // ------------------------------------------------
  // Read API key from Chrome storage
  // ------------------------------------------------

  const stored =
    await chrome.storage.sync.get(
      "apiKey"
    );


  const apiKey =
    stored.apiKey;


  if (!apiKey) {

    throw new Error(
      "Jev API key is not configured."
    );

  }


  // ------------------------------------------------
  // Build a tiny test request
  //
  // We intentionally use the same System One
  // endpoint used by the actual ad detection.
  // ------------------------------------------------

  const payload = {

    model:
      JEV_MODEL,

    state: {

      test: true

    },

    questions: {

      test: {

        type:
          "noul",

        instructions:
          "Is the number 2 greater than the number 1?",

        criteria: {

          true:
            "The number 2 is greater than the number 1.",

          false:
            "The number 2 is not greater than the number 1."

        }

      }

    }

  };


  // ------------------------------------------------
  // Send test request
  // ------------------------------------------------

  const response =
    await fetch(

      JEV_ENDPOINT,

      {

        method:
          "POST",

        headers: {

          "Authorization":
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json"

        },

        body:
          JSON.stringify(
            payload
          )

      }

    );


  // ------------------------------------------------
  // Handle API errors
  // ------------------------------------------------

  if (!response.ok) {

    const errorText =
      await response.text();


    throw new Error(

      `Jev API returned ${response.status}: ${errorText}`

    );

  }


  // ------------------------------------------------
  // Parse response
  // ------------------------------------------------

  const data =
    await response.json();


  console.log(
    "JevGuard key test response:",
    data
  );


  // ------------------------------------------------
  // Validate the Noul response
  // ------------------------------------------------

  const answer =
    data?.answers?.test;


  if (
    !answer ||
    answer.type !== "noul" ||
    typeof answer.noul !== "number"
  ) {

    throw new Error(
      "Jev returned an unexpected response."
    );

  }


  // ------------------------------------------------
  // Return clean result to popup
  // ------------------------------------------------

  return {

    success:
      true,

    model:
      data.model ?? JEV_MODEL,

    probability:
      answer.noul,

    message:
      "Jev API key is working."

  };

}


// --------------------------------------------------
// Send candidates to Jev
// --------------------------------------------------

async function requestJev(payload, apiKey) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_JEV_RETRIES; attempt++) {

    try {
      console.log(
        `[JevGuard] Jev request attempt ${attempt + 1}/${MAX_JEV_RETRIES + 1}`
      );

      const response = await fetch(
        JEV_ENDPOINT,
        {
          method: "POST",

          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },

          body: JSON.stringify(payload)
        }
      );

      if (response.ok) {
        return await response.json();
      }

      const errorText = await response.text();

      lastError = new Error(
        `Jev API returned ${response.status}: ${errorText}`
      );

      // Do not retry permanent errors.
      if (!RETRYABLE_STATUS_CODES.has(response.status)) {
        throw lastError;
      }

      // No retries remaining.
      if (attempt === MAX_JEV_RETRIES) {
        throw lastError;
      }

      const delay = RETRY_DELAYS[attempt] ?? 4000;

      console.warn(
        `[JevGuard] Retryable Jev error ${response.status}. ` +
        `Retrying in ${delay}ms...`
      );

      await new Promise(resolve =>
        setTimeout(resolve, delay)
      );

    } catch (error) {

      lastError = error;

      // Don't retry errors that we deliberately threw
      // for permanent HTTP statuses.
      if (
        error?.message?.startsWith("Jev API returned") &&
        !RETRYABLE_STATUS_CODES.has(
          Number(
            error.message.match(/returned (\d+)/)?.[1]
          )
        )
      ) {
        throw error;
      }

      // Network / fetch error.
      if (attempt === MAX_JEV_RETRIES) {
        throw error;
      }

      const delay = RETRY_DELAYS[attempt] ?? 4000;

      console.warn(
        `[JevGuard] Jev request failed. ` +
        `Retrying in ${delay}ms...`,
        error
      );

      await new Promise(resolve =>
        setTimeout(resolve, delay)
      );
    }
  }

  throw lastError ||
    new Error("Jev request failed.");
}

async function checkAdsWithJev(
  candidates,
  page
) {

  console.log(
    "Jev received candidates:",
    candidates
  );


  console.log(
    "Jev received page:",
    page
  );


  // ------------------------------------------------
  // Validate candidates
  // ------------------------------------------------

  if (
    !Array.isArray(candidates) ||
    candidates.length === 0
  ) {

    throw new Error(
      "No candidates supplied."
    );

  }


  // ------------------------------------------------
  // Maximum candidates per request
  // ------------------------------------------------

  if (
    candidates.length >
    MAX_CANDIDATES_PER_REQUEST
  ) {

    throw new Error(

      `Too many candidates. Maximum is ` +
      `${MAX_CANDIDATES_PER_REQUEST} per request.`

    );

  }


  // ------------------------------------------------
  // Validate page
  // ------------------------------------------------

  if (!page) {

    page = {

      hostname:
        "unknown",

      title:
        ""

    };

  }


  // ------------------------------------------------
  // Build one Noul question per candidate
  // ------------------------------------------------

  const questions = {};


  candidates.forEach(
    (_, index) => {

      questions[
        `ad_${index}`
      ] = {

        type:
          "noul",

        instructions:

          `Is the page element ` +
          `\`candidates[${index}]\` ` +
          "a paid advertisement or sponsored " +
          "promotional placement? " +
          "Judge it by its text, label, link targets, " +
          "iframe source, attributes, and shape, " +
          "in the context of `page`.",

        criteria:
          AD_CRITERIA

      };

    }
  );


  // ------------------------------------------------
  // Build System One request
  // ------------------------------------------------

  const payload = {

    model:
      JEV_MODEL,

    state: {

      page:
        page,

      candidates:
        candidates

    },

    questions:
      questions

  };


  console.log(
    "JevGuard request payload:",
    payload
  );


  // ------------------------------------------------
  // Get API key
  // ------------------------------------------------

  const stored =
    await chrome.storage.sync.get(
      "apiKey"
    );


  const apiKey =
    stored.apiKey;


  if (!apiKey) {

    throw new Error(
      "Jev API key is not configured."
    );

  }


  // ------------------------------------------------
  // Send request to Jev
  // ------------------------------------------------

const body = await requestJev(
  payload,
  apiKey
);


  console.log(
    "Raw Jev API response:",
    body
  );


  // ------------------------------------------------
  // Extract probabilities
  // ------------------------------------------------

  const probabilities = [];


  for (
    let index = 0;
    index < candidates.length;
    index++
  ) {

    const answer =
      body?.answers?.[
        `ad_${index}`
      ];


    if (
      !answer ||
      answer.type !== "noul" ||
      typeof answer.noul !== "number"
    ) {

      throw new Error(

        `Missing Noul answer ` +
        `for candidate ${index}.`

      );

    }


    probabilities.push(
      answer.noul
    );

  }


  // ------------------------------------------------
  // Return clean result to content.js
  // ------------------------------------------------

  return {

    model:
      body.model,

    probabilities:
      probabilities,

    usage:
      body.usage

  };

}