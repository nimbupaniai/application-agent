// Store tab data
const tabData = new Map();

// Check if URL is accessible
function isValidUrl(url) {
  return (
    url &&
    !url.startsWith('chrome://') &&
    !url.startsWith('chrome-extension://') &&
    !url.startsWith('edge://')
  );
}

// Listen for navigation events
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0 && isValidUrl(details.url)) {
    updateTabData(details.tabId);
  }
});

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startScraping') {
    handleScraping(message.tabId, message.url);
    return true; // Keep message channel open for async response
  }

  if (message.action === 'contentScriptData') {
    const data = message.data;
    if (sender.tab) {
      tabData.set(sender.tab.id, data);
    }
    // Forward the data to popup
    chrome.runtime.sendMessage({
      type: 'scrapingComplete',
      data: data,
    });
  }
});

// Handle dynamic updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && isValidUrl(tab.url)) {
    updateTabData(tabId);
  }
});

async function updateTabData(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!isValidUrl(tab.url)) {
      throw new Error('Cannot access this type of URL');
    }

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js'],
    });
  } catch (error) {
    console.error('Failed to inject content script:', error);
    chrome.runtime.sendMessage({
      type: 'scrapingError',
      error: 'This page cannot be scraped due to browser restrictions.',
    });
  }
}

async function handleScraping(tabId, url) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!isValidUrl(tab.url)) {
      throw new Error('Cannot access this type of URL');
    }

    // First ensure content script is injected
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js'],
    });

    // Then trigger the scraping
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: () => {
        // This will call the scrapeContent function defined in content.js
        if (typeof scrapeContent === 'function') {
          scrapeContent();
        }
      },
    });
  } catch (error) {
    console.error('Scraping failed:', error);
    chrome.runtime.sendMessage({
      type: 'scrapingError',
      error: 'This page cannot be scraped due to browser restrictions.',
    });
  }
}

// Keep service worker alive
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});
