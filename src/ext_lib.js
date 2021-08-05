export { sendMessage }

async function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, msg, (resp) => { resolve(resp) });
    });
  });
}
