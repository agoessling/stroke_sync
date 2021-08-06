export { syncRounds }

import firebase from 'firebase/app';
import 'firebase/firestore';

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

function getScorecardSummaries(number) {
  const path = 'scorecard/summary';
  let url = new URL(API_URL + path);
  url.searchParams.append('per-page', number);

  return getJson(url.href);
}

function getScorecardDetail(scorecardId) {
  const path = 'scorecard/detail';
  let url = new URL(API_URL + path);
  url.searchParams.append('scorecard-ids', scorecardId);

  return getJson(url.href);
}

async function getClubTypes() {
  let path = 'club/types';
  let url = new URL(API_URL + path);

  const clubLookupP = getJson(url.href);

  path = 'club/player';
  url = new URL(API_URL + path);

  const clubsInBagP = getJson(url.href);

  const [clubLookup, clubsInBag] = await Promise.all([clubLookupP, clubsInBagP]);

  return {clubLookup: clubLookup, clubsInBag: clubsInBag};
}

function getHoleDetail(scorecardId) {
  const path = 'shot/scorecard/' + scorecardId + '/hole';
  let url = new URL(API_URL + path);
  url.searchParams.append('image-size', 'IMG_730X730'); // Don't know why this is required.

  return getJson(url.href);
}

async function getIdsToSync(user) {
  const db = firebase.firestore();

  const summaryP = getScorecardSummaries(10000);
  const userDocP = db.collection('users').doc(user.uid).get();

  const [summary, userDoc] = await Promise.all([summaryP, userDocP]);

  let lastGarminId = null;
  if (userDoc.exists && userDoc.get('lastGarminId')) {
    lastGarminId = userDoc.get('lastGarminId');
  }

  let newIds = [];
  for (let { id } of summary.scorecardSummaries) {
    if (id == lastGarminId) {
      break;
    }
    newIds.push(id);
  }

  return newIds;
}

async function syncIds(user, ids) {
  if (!ids.length) {
    return;
  }

  const db = firebase.firestore();

  const clubTypesP = getClubTypes();

  const promises = ids.map((id) => {
    return Promise.all([getScorecardDetail(id), getHoleDetail(id)]);
  });
  const detailsP = Promise.all(promises);

  const [clubTypes, details] = await Promise.all([clubTypesP, detailsP]);

  const batch = db.batch();

  const userDocRef = db.collection('users').doc(user.uid);
  batch.set(userDocRef, {lastGarminId: ids[0]}, {merge: true});

  for (let [scorecardDetail, holeDetail] of details) {
    const roundDocRef = userDocRef.collection('rounds').doc();
    batch.set(roundDocRef,
      {
        rawData: {
          garmin: {
            scorecardDetail: scorecardDetail,
            holeDetail: holeDetail,
            clubTypes: clubTypes
          }
        }
      }
    );
  }

  return batch.commit();
}

async function syncRounds(user) {
  const newIds = await getIdsToSync(user);
  await syncIds(user, newIds);

  return newIds.length;
}
