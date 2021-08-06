<template>
  <section id="auth"></section>
  <div id="verify-email" v-if="verifyEmail">
    Please check your email for a verification link.
    <a href="#" @click.prevent="startAuth" class="link">Then log back in.</a>
  </div>
</template>

<script setup>
  import { onMounted, ref } from 'vue'

  import firebase from 'firebase/app'
  import * as firebaseui from 'firebaseui'
  import 'firebaseui/dist/firebaseui.css'

  const verifyEmail = ref(false);
  const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(firebase.auth());

  function startAuth() {
    verifyEmail.value = false;

    ui.start('#auth', {
      signInFlow: 'popup',
      signInOptions: [
        {
          provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
          requireDisplayName: true,
        },
      ],
      callbacks: {
        signInSuccessWithAuthResult: function(authResult) {
          const user = authResult.user;
          if (!user.emailVerified) {
            verifyEmail.value = true;
            user.sendEmailVerification();
          }
        },
      }
    });
  }

  onMounted(startAuth);
</script>

<style>
  #auth {
    padding: 10px;
  }
  #verify-email {
    padding: 20px;
  }
</style>
