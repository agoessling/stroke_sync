export { syncRounds }

import firebase from 'firebase/app';
import 'firebase/firestore';

function orNull(val) {
  return val ? val : null;
}

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

function getStandardRoundFromGarmin(round) {
  const scorecardDetail = round.rawData.garmin.scorecardDetail;
  const courseSnapshot = scorecardDetail.courseSnapshots[0];
  const scorecard = scorecardDetail.scorecardDetails[0].scorecard;
  const scorecardStats = scorecardDetail.scorecardDetails[0].scorecardStats;

  const output = {};

  output.courseName = courseSnapshot.name;
  output.datePlayed = new Date(scorecard.endTime);
  output.teeBox = scorecard.teeBox.toLowerCase();
  output.par = courseSnapshot.roundPar;
  output.strokes = scorecardStats.round.strokes;

  output.holes = [];

  for (let i = 0; i < 18; ++i) {
    const hole = {};
    hole.number = i + 1;
    hole.par = Number(courseSnapshot.holePars[i]);

    const garminHole = scorecard.holes[i];
    hole.strokes = garminHole ? orNull(garminHole.strokes) : null;
    hole.putts = garminHole ? orNull(garminHole.putts) : null;

    if (garminHole && garminHole.penalties) {
      hole.penalties = Array(garminHole.penalties).fill('outOfBounds');
    } else {
      hole.penalties = [];
    }

    if (garminHole && garminHole.fairwayShotOutcome) {
      hole.teeShot = garminHole.fairwayShotOutcome.toLowerCase();
    } else {
      hole.teeShot = null;
    }

    output.holes.push(hole);
  }

  return output;
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

    let roundDoc = {
      syncStatus: {
        garmin: true,
        grint: false,
      },
      rawData: {
        garmin: {
          scorecardDetail: scorecardDetail,
          holeDetail: holeDetail,
          clubTypes: clubTypes,
        },
      },
    };

    Object.assign(roundDoc, getStandardRoundFromGarmin(roundDoc));

    batch.set(roundDocRef, roundDoc);
  }

  return batch.commit();
}

async function syncRounds(user) {
  const newIds = await getIdsToSync(user);
  await syncIds(user, newIds);

  return newIds.length;
}
