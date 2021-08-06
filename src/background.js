browser.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  console.log([request, sender, sendResponse]);
  console.log('Hello from the background');
});
