export { importRounds };

import Fuse from 'fuse.js';

import firebase from 'firebase/app';
import 'firebase/firestore';

async function createInsertData(roundDoc) {
  const data = {};

  const [userId, courseId] = await Promise.all([getUserId(), findCourseId(roundDoc.courseName)]);
  const teeOptions = await getTees(courseId);

  data.userid1 = userId;
  data.course = courseId;
  data.round = 18;
  data.year = roundDoc.datePlayed.toDate().getFullYear();
  data.month = roundDoc.datePlayed.toDate().getMonth() + 1;
  data.date = roundDoc.datePlayed.toDate().getDate();

  const teeRanking = [
    ['green'],
    ['forward', 'red'],
    ['resort'],
    ['middle', 'white', 'member', 'regular'],
    ['back', 'blue', 'gold', 'championship'],
    ['black', 'tournament'],
    ['professional'],
  ];

  data.tees = teeOptions.find(x => x.toLowerCase() == roundDoc.teeBox);

  const teeIndex = teeRanking.findIndex(x => x.includes(roundDoc.teeBox));
  if (!data.tees && teeIndex > 0) {
    let closestOption;
    let smallestDistance = Infinity;

    teeOptions.forEach((option) => {
      const index = teeRanking.findIndex(x => x.includes(option.toLowerCase()));

      const distance = Math.abs(teeIndex - index);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        closestOption = option;
      }
    });

    data.tees = closestOption;
  }

  const penaltyLookup = {
    waterHazard: 'w',
    dropShot: 'd',
    outOfBounds: 'o',
    greensideSand: 's',
    fairwaySand: 'f',
  };

  const teeShotLookup = {
    null: '',
    hit: 3,
    left: 1,
    right: 2,
    short: 4,
    long: 6,
    missed: 5,
  }

  for (let hole of roundDoc.holes) {
    data['scH' + hole.number] = hole.strokes;
    data['ptH' + hole.number] = hole.putts;
    data['pH' + hole.number] = hole.penalties.reduce((acc, x) => acc + penaltyLookup[x], '');
    data['fH' + hole.number] = teeShotLookup[hole.teeShot];
  }

  return data;
}

function formDataFromObject(data) {
  const form = new FormData();

  for (let key in data) {
    form.append(key, data[key]);
  }

  return form;
}

function postData(url, data) {
  const responseP = fetch(url, {
    method: 'POST',
    body: formDataFromObject(data),
  });

  return responseP;
}

async function getCourseNameSuggestions(name) {
  const response = await postData('https://thegrint.com/ajax/courseAutoComplete', {
    search: name,
    wave: 0,
    limit: 10
  });

  return response.json();
}

async function findCourseId(name) {
  let words = name.split(' ');

  while (words.length > 0) {
    const searchName = words.join(' ');
    const results = await getCourseNameSuggestions(searchName);

    if (results.length == 0) {
      words.pop();
      continue;
    }

    const fuse = new Fuse(results, {keys: ['name']});
    const [closest, ] = fuse.search(name)

    if (closest) {
      return closest.item.id;
    }
  }

  return null;
}

async function getTees(courseId) {
  const url = 'https://thegrint.com/score/ajax_tees/' + courseId;
  const response = await fetch(url, {method: 'GET'});

  const parser = new DOMParser();
  const doc = parser.parseFromString(await response.text(), 'text/html');

  const options = doc.querySelectorAll('option.option-tee');

  return Array.from(options, x => x.getAttribute('value'));
}

async function getUserId() {
  const url = 'https://thegrint.com/score/add_full_score';
  const response = await fetch(url, {method: 'GET'});

  const parser = new DOMParser();
  const doc = parser.parseFromString(await response.text(), 'text/html');

  return doc.querySelector('input#userid1').getAttribute('value');
}

async function importRounds(user) {
  const db = firebase.firestore();

  const roundsRef = db.collection('users').doc(user.uid).collection('rounds');
  const roundDocs = await roundsRef.where('syncStatus.grint', '==', false).get();

  const promises = roundDocs.docs.map(async (x) => {
    const data = await createInsertData(x.data());
    return postData('https://thegrint.com/score/insert_revamp', data);
  });

  await Promise.all(promises);

  const batch = db.batch();

  roundDocs.forEach(x => batch.update(x.ref, {'syncStatus.grint': true}));

  batch.commit();

  return roundDocs.size;
}
