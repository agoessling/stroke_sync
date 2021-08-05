async function getJson(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'nk': 'NT', // Required, although unclear why.
    },
  });

  if (!response.ok) {
    throw new Error('Could not fetch JSON: ' + response.status);
  }

  return response.json()
}

const API_URL = 'https://connect.garmin.com/modern/proxy/gcs-golfcommunity/api/v2/';

function getSummaries(number) {
  const path = 'scorecard/summary';
  let url = new URL(API_URL + path);
  url.searchParams.append('per-page', number);

  return getJson(url.href);
}

function getDetail(scorecardId) {
  const path = 'scorecard/detail';
  let url = new URL(API_URL + path);
  url.searchParams.append('scorecard-ids', scorecardId);

  return getJson(url.href);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'getSummaries':
      getSummaries(request.args.number).then((resp) => sendResponse(resp));
      break;
    case 'getDetail':
      getDetail(request.args.scorecardId).then((resp) => sendResponse(resp));
      break;
    default:
      throw 'Unknown RPC type: ' + request.type;
  }

  return true;
});
