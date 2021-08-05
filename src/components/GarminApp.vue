<template>
  <va-button @click="onSync">Sync</va-button>
</template>

<script setup>
  import { sendMessage } from '@/ext_lib.js';

  import firebase from 'firebase/app';
  import 'firebase/firestore';

  async function onSync() {
    const user = firebase.auth().currentUser;
    if (!user || !user.emailVerified) {
      return;
    }

    const db = firebase.firestore();

    const summaryPromise = sendMessage({ type: 'getSummaries', args: { number: 10 } });
    const userDocPromise = db.collection('users').doc(user.uid).get();

    const [summary, userDoc] = Promise.all([summaryPromise, userDocPromise]);

    let garminIds = [];
    if (userDoc.exists && userDoc.get('garminIds')) {
      garminIds = userDoc.get('garminIds');
    }

    const summaryIds = summary.scorecardSummaries.map(({ id }) => id);
    const newIds = summaryIds.filter(x => !garminIds.includes(x));

    const promises = scorecardIds.map((id) => {
      return sendMessage({ type: 'getDetail', args: { scorecardId: id } });
    });
    const details = await Promise.all(promises);
    console.log(details);

  }
</script>

<style>
</style>
