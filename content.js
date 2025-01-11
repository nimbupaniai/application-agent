function scrapeContent() {
  // Get HTML
  const html = document.documentElement.outerHTML;

  // Get CSS
  const cssRules = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        cssRules.push(rule.cssText);
      }
    } catch (e) {
      // Skip external stylesheets that may throw CORS errors
      continue;
    }
  }

  // Get inline styles
  const elementsWithStyle = document.querySelectorAll('[style]');
  elementsWithStyle.forEach((element) => {
    cssRules.push(
      `/* Inline style for ${element.tagName.toLowerCase()} */\n${element.getAttribute(
        'style'
      )}`
    );
  });

  // Track dynamic changes
  const dynamicChanges = [];
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        dynamicChanges.push(
          `DOM Changed: ${mutation.target.nodeName} had ${mutation.addedNodes.length} nodes added and ${mutation.removedNodes.length} removed`
        );
      } else if (mutation.type === 'attributes') {
        dynamicChanges.push(
          `Attribute Changed: ${mutation.target.nodeName} - ${mutation.attributeName}`
        );
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    attributes: true,
    subtree: true,
  });

  // Send data back to background script
  chrome.runtime.sendMessage({
    action: 'contentScriptData',
    data: {
      html: html,
      css: cssRules.join('\n'),
      dynamic: dynamicChanges.join('\n'),
    },
  });
}

// Execute scraping when content script is loaded
scrapeContent();

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scrape') {
    scrapeContent();
  }
});
