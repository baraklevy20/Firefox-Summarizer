var textToSummarize;

browser.runtime.onMessage.addListener((message) => textToSummarize = message);
