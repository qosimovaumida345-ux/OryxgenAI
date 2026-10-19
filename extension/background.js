// Oryxgen AI — Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  // Context menus for quick AI actions
  chrome.contextMenus.create({
    id: "oryxgen_explain",
    title: "Oryxgen AI: Tanlangan matnni tushuntirish",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "oryxgen_summarize_page",
    title: "Oryxgen AI: Ushbu sahifani tahlil qilish",
    contexts: ["page"],
  });

  // Default configuration
  chrome.storage.local.get(["apiUrl", "selectedModel"], (data) => {
    if (!data.apiUrl) {
      chrome.storage.local.set({ apiUrl: "https://oryxgen-api.onrender.com" });
    }
    if (!data.selectedModel) {
      chrome.storage.local.set({ selectedModel: "claude-sonnet-5.5" });
    }
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "oryxgen_explain" && info.selectionText) {
    chrome.action.openPopup?.();
  } else if (info.menuItemId === "oryxgen_summarize_page") {
    chrome.action.openPopup?.();
  }
});
