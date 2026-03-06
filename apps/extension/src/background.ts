/** Background service worker for Daily Report extension */

// Register context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'add-to-daily-report',
    title: 'Add to Daily Report',
    contexts: ['selection'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'add-to-daily-report') return;

  // Store pending task data in chrome.storage.local
  // (MV3 service workers can terminate at any time, no in-memory state)
  await chrome.storage.local.set({
    pendingTask: {
      title: info.selectionText || '',
      sourceLink: info.pageUrl || tab?.url || '',
    },
  });

  // Open the popup programmatically (Chrome 127+ required)
  try {
    await chrome.action.openPopup();
  } catch {
    // openPopup may fail if popup is already open or in certain contexts.
    // The user can always click the extension icon manually.
    console.warn('Could not open popup automatically. Click the extension icon.');
  }
});
