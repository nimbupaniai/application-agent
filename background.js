chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startScraping') {
    chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      files: ['content.js'],
    });
  }

  if (message.action === 'contentScriptData') {
    // Forward the scraped data to the popup
    chrome.runtime.sendMessage({
      type: 'scrapingComplete',
      data: message.data,
    });
  }
});

// Also track dynamic changes
chrome.webNavigation.onCompleted.addListener((details) => {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    function: () => {
      // Notify that the page has been updated
      chrome.runtime.sendMessage({
        action: 'pageUpdated',
        timestamp: new Date().toISOString(),
      });
    },
  });
});
