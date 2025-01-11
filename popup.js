let currentTab = 'html';
let scrapedData = {
  html: '',
  css: '',
};

document.addEventListener('DOMContentLoaded', () => {
  const scrapeButton = document.getElementById('scrapeButton');
  const copyButton = document.getElementById('copyButton');
  const downloadButton = document.getElementById('downloadButton');
  const output = document.getElementById('output');
  const status = document.getElementById('status');
  const tabs = document.querySelectorAll('.tab');

  // Tab switching
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      updateOutput();
    });
  });

  function updateOutput() {
    if (currentTab === 'html') {
      output.value = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Scraped Page</title>
    <style>
${scrapedData.css}
    </style>
</head>
<body>
${scrapedData.html}
</body>
</html>`;
    } else {
      output.value = scrapedData[currentTab] || '';
    }
  }

  // Listen for scraping results
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'scrapingComplete') {
      scrapedData = message.data;
      updateOutput();
      status.textContent = 'Scraping complete!';
    }
  });

  // Scrape button click handler
  scrapeButton.addEventListener('click', async () => {
    try {
      status.textContent = 'Scraping...';
      output.value = '';

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        throw new Error('No active tab found');
      }

      // Check if URL exists first
      if (!tab.url) {
        throw new Error('No URL found for current tab');
      }

      // Then check if URL is valid
      if (
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('edge://')
      ) {
        throw new Error('Cannot scrape browser system pages');
      }

      chrome.runtime.sendMessage({
        action: 'startScraping',
        tabId: tab.id,
        url: tab.url,
      });
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
      console.error('Scraping error:', err);
      output.value = 'This page cannot be scraped due to browser restrictions.';
    }
  });

  // Copy button click handler
  copyButton.addEventListener('click', () => {
    output.select();
    document.execCommand('copy');
    status.textContent = 'Copied to clipboard!';
  });

  // Download button click handler
  downloadButton.addEventListener('click', () => {
    const blob = new Blob([output.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      currentTab === 'html'
        ? 'scraped_page.html'
        : `scraped_${currentTab}.${currentTab}`;
    a.click();
    URL.revokeObjectURL(url);
    status.textContent = 'File downloaded!';
  });

  // Add this to your existing event listeners in popup.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'scrapingError') {
      status.textContent = message.error;
      output.value = message.error;
    }
  });
});
