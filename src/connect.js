import firebase from 'firebase-admin'
import serviceAccountKey from './serviceAccountKey.json'

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccountKey),
  databaseURL: 'https://cashboxparty-80b96.firebaseio.com/'
})

const ref = firebase.database().ref('cashboxparty')

export default ref
