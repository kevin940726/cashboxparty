import firebase from 'firebase-admin';
import serviceAccountKey from './serviceAccountKey.json';

const app = firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccountKey),
  databaseURL: 'https://cashboxparty-80b96.firebaseio.com/',
});

const database = firebase.database();

const ref = database.ref('cashboxparty');

// some weird hack happened here...,
// I'm not sure why, will come back later.
export const disconnect = app.delete.bind(app);

export default ref;
