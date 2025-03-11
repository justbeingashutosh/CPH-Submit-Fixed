// background.js

function stringifySorted(obj) {
  if (!obj) return '';
  const allKeys = Object.keys(obj).sort();
  const sortedObj = {};
  for (const key of allKeys) {
    sortedObj[key] = obj[key];
  }
  return JSON.stringify(sortedObj);
}

// Store pending submission info of each tab
const pendingSubmissions = {};

// Injecting content.js
async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    });
  } catch (error) {
    console.warn("Content script injection failed or already injected.", error);
  }
}

async function fetchSubmitData() {
  try {
    const response = await fetch("http://localhost:27121/getSubmit");
    if (!response.ok) {
      console.error("Fetch failed with status:", response.status);
      return;
    }
    const data = await response.json();
    console.log("Fetched data:", data);

    // Check if empty data recieved
    if (data && !data.empty) {
      chrome.storage.local.get("lastData", async (result) => {
        const lastData = result.lastData;
        console.log("Last stored data:", lastData);

        if (
          stringifySorted(data) !== stringifySorted(lastData) &&
          stringifySorted(data) !== stringifySorted({ empty: true })
        ) {
          chrome.storage.local.set({ lastData: data }, () => {
            console.log("Updated lastData in storage.");
          });

          //Submission during contest requires different route.
          const submitUrl = data.url.includes('/contest/')
            ? `https://codeforces.com/contest/${data.url.split('/')[4]}/submit`
            : "https://codeforces.com/problemset/submit";

          // Create a new tab for the submit page and store the submission data.
          chrome.tabs.create({ url: submitUrl }, (tab) => {
            console.log(`Created submit page tab with id: ${tab.id} at URL: ${submitUrl}`);
            pendingSubmissions[tab.id] = data;
          });
        } else {
          console.log("Data is unchanged. No message sent.");
        }
      });
    }
  } catch (error) {
    console.error("Error fetching submit data:", error);
  }
}

// Check load status of submission page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // If this tab has pending submission data and the page is fully loaded...
  if (pendingSubmissions[tabId] && changeInfo.status === "complete") {
    if (
      tab.url && 
      (tab.url.includes("codeforces.com/problemset/submit") ||
       tab.url.includes("codeforces.com/contest/"))
    ) {
      console.log("Submit page finished loading in tab", tabId);
      ensureContentScript(tabId).then(() => {
        chrome.tabs.sendMessage(
          tabId,
          {
            type: "cph-submit",
            payload: pendingSubmissions[tabId],
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn(
                `Failed to send message to tab ${tabId}:`,
                chrome.runtime.lastError.message
              );
            } else {
              console.log("Message sent successfully to tab", tabId);
            }
          }
        );
        // Clear the pending submission for this tab.
        delete pendingSubmissions[tabId];
      });
    }
  }
});

// Start the periodic fetch.
chrome.runtime.onInstalled.addListener(() => {
  console.log("Background script installed. Starting fetch loop.");
  setInterval(fetchSubmitData, 3000);
});

setInterval(fetchSubmitData, 3000);
