// Oryxgen AI — Browser Content Script
// Extracts page context, monitors errors, and executes DOM actions

(() => {
  // Capture page errors
  const pageErrors = [];
  window.addEventListener("error", (event) => {
    pageErrors.push({
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      time: new Date().toISOString(),
    });
    if (pageErrors.length > 20) pageErrors.shift();
  });

  // Listen for messages from popup or background service worker
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageContext") {
      const selection = window.getSelection() ? window.getSelection().toString().trim() : "";
      
      // Clean visible text from DOM
      const clone = document.body ? document.body.cloneNode(true) : null;
      if (clone) {
        const scripts = clone.querySelectorAll("script, style, noscript, svg");
        scripts.forEach((el) => el.remove());
      }
      const rawText = clone ? clone.innerText || clone.textContent || "" : "";
      const cleanedText = rawText.replace(/\s+/g, " ").trim().slice(0, 16000);

      sendResponse({
        ok: true,
        url: window.location.href,
        title: document.title,
        selection,
        metaDescription: document.querySelector('meta[name="description"]')?.content || "",
        pageText: cleanedText,
        detectedErrors: pageErrors,
      });
      return true;
    }

    if (request.action === "highlightSelection") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const span = document.createElement("span");
        span.style.backgroundColor = "rgba(0, 240, 255, 0.35)";
        span.style.borderRadius = "3px";
        span.style.padding = "2px 4px";
        try {
          range.surroundContents(span);
        } catch (_) {}
      }
      sendResponse({ ok: true });
      return true;
    }

    if (request.action === "clickElement") {
      const { selector } = request;
      const el = document.querySelector(selector);
      if (el) {
        el.click();
        sendResponse({ ok: true, message: `Clicked element: ${selector}` });
      } else {
        sendResponse({ ok: false, error: `Element not found: ${selector}` });
      }
      return true;
    }

    if (request.action === "fillInput") {
      const { selector, value } = request;
      const el = document.querySelector(selector);
      if (el) {
        el.value = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        sendResponse({ ok: true, message: `Filled element: ${selector}` });
      } else {
        sendResponse({ ok: false, error: `Element not found: ${selector}` });
      }
      return true;
    }

    if (request.action === "scroll") {
      const { direction, amount } = request;
      const dy = direction === "up" ? -(amount || 400) : (amount || 400);
      window.scrollBy({ top: dy, behavior: "smooth" });
      sendResponse({ ok: true });
      return true;
    }

    return false;
  });
})();
