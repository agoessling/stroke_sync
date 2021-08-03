import { createApp } from 'vue'
import App from './App.vue'

import { VuesticPlugin } from 'vuestic-ui'
import 'vuestic-ui/dist/vuestic-ui.css'

import firebase from 'firebase/app'

const firebaseConfig = {
  apiKey: "AIzaSyAMtTLHRxSwt9boUXBlxc-ZuTpBHgOreuY",
  authDomain: "stroke-sync.firebaseapp.com",
  projectId: "stroke-sync",
  storageBucket: "stroke-sync.appspot.com",
  messagingSenderId: "1004602781052",
  appId: "1:1004602781052:web:a3a59466c53ebabe6748f9",
  measurementId: "G-18YT5P51C9"
}
firebase.initializeApp(firebaseConfig)

const app = createApp(App)
app.use(VuesticPlugin)
app.mount('#app')
