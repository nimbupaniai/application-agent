// Create a MutationObserver to watch for DOM changes
let observer = null;

function scrapeContent() {
  // Get HTML content
  const bodyContent = document.body.innerHTML;

  // Get CSS
  const cssRules = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        cssRules.push(rule.cssText);
      }
    } catch (e) {
      if (sheet.href) {
        cssRules.push(`/* External stylesheet: ${sheet.href} */`);
        cssRules.push(`@import url("${sheet.href}");`);
      }
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

  // Send data to background script
  chrome.runtime.sendMessage({
    action: 'contentScriptData',
    data: {
      html: bodyContent,
      css: cssRules.join('\n'),
      timestamp: new Date().toISOString(),
    },
  });

  // Set up observer if not already running
  if (!observer) {
    setupObserver();
  }
}

function setupObserver() {
  observer = new MutationObserver((mutations) => {
    // Debounce the scraping to avoid too many updates
    if (observer.timeout) {
      clearTimeout(observer.timeout);
    }
    observer.timeout = setTimeout(() => {
      scrapeContent();
    }, 1000); // Wait 1 second after changes before scraping
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });
}

// Initial scrape
scrapeContent();
