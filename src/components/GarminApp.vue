<template>
  <div v-if="!garminLoggedIn">Please log into Garmin Connect.</div>
  <div v-else>
    <div v-show="showSyncBusy">Syncing...</div>
    <div v-show="showSyncNumber">{{ syncNumber }} rounds sync'd.</div>
    <va-button @click="onSync">Sync</va-button>
  </div>
</template>

<script setup>
  import { syncRounds } from '@/garmin.js';
  import { ref } from 'vue';

  import firebase from 'firebase/app';

  let garminLoggedIn = ref(true);
  let syncNumber = ref(0);
  let showSyncNumber = ref(false);
  let showSyncBusy = ref(false);

  chrome.cookies.get({url: 'https://connect.garmin.com', name: 'GARMIN-SSO'}, (x) => {
    garminLoggedIn.value = x != null;
  });

  async function onSync() {
    const user = firebase.auth().currentUser;
    if (!user || !user.emailVerified) {
      return;
    }

    showSyncNumber.value = false;
    showSyncBusy.value = true;

    const number = await syncRounds(user);

    syncNumber.value = number;
    showSyncBusy.value = false;
    showSyncNumber.value = true;
  }
</script>

<style>
</style>
