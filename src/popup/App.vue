<template>
  <div class="link" @click.prevent="signOut">Sign Out</div>
  <h1 class="display-3 sstitle">Stroke Sync</h1>
  <Login v-if="!loggedIn"></Login>
  <GarminApp v-if="loggedIn && showGarmin"></GarminApp>
</template>

<script setup>
  import Login from '@/components/Login.vue'
  import GarminApp from '@/components/GarminApp.vue'

  import { onMounted, ref } from 'vue'
  import firebase from 'firebase/app'

  const loggedIn = ref(true);
  const showGarmin = ref(true);

  firebase.auth().onAuthStateChanged((user) => {
    if (user && user.emailVerified) {
      loggedIn.value = true;
    } else {
      loggedIn.value = false;
    }
  });

  function signOut() {
    firebase.auth().signOut();
  }

  onMounted(async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    showGarmin.value = url.hostname == 'connect.garmin.com';
  });
</script>

<style>
  html {
    width: 400px;
  }

  .sstitle {
    text-align: center;
    padding: 10px;
  }
</style>
