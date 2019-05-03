var textToSummarize;

document.addEventListener('mouseup', () => {
	textToSummarize = window.getSelection().toString();
	browser.runtime.sendMessage(textToSummarize);
});
