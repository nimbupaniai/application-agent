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
      if (currentTab === 'html') {
        // For HTML tab, show the complete HTML with embedded CSS
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
    });
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

      // Inject and execute content script directly
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          // Get HTML content (only the body content)
          const bodyContent = document.body.innerHTML;

          // Get CSS
          const cssRules = [];
          for (const sheet of document.styleSheets) {
            try {
              for (const rule of sheet.cssRules) {
                cssRules.push(rule.cssText);
              }
            } catch (e) {
              // If we can't access the rules (e.g., for cross-origin stylesheets)
              // Try to get the href and add it as a link
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

          return {
            html: bodyContent,
            css: cssRules.join('\n'),
          };
        },
      });

      if (results && results[0]) {
        scrapedData = results[0].result;
        // Show the complete HTML with embedded CSS by default
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
        status.textContent = 'Scraping complete!';
      }
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
      console.error('Scraping error:', err);
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
});
