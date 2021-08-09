<template>
  <div v-if="!grintLoggedIn">Please log into The Grint.</div>
  <div v-else>
    <div v-show="showSyncBusy">Syncing...</div>
    <div v-show="showSyncNumber">{{ syncNumber }} rounds imported.</div>
    <va-button @click="onImportAll">Import All</va-button>
  </div>
</template>

<script setup>
  import { ref } from 'vue';

  import { importRounds } from '@/grint.js';

  import firebase from 'firebase/app';

  let grintLoggedIn = ref(true);
  let syncNumber = ref(0);
  let showSyncNumber = ref(false);
  let showSyncBusy = ref(false);

  async function onImportAll() {
    const user = firebase.auth().currentUser;
    if (!user || !user.emailVerified) {
      return;
    }

    showSyncNumber.value = false;
    showSyncBusy.value = true;

    const number = await importRounds(user);

    syncNumber.value = number;
    showSyncBusy.value = false;
    showSyncNumber.value = true;
  }
</script>

<style>
</style>
