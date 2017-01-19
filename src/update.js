import NyanProgress from 'nyan-progress';
import PromisePool from 'es6-promise-pool';
import ref, { disconnect } from './connect';
import LANGS from './langCode';
import { flattenArray } from './utils';
import { getNewSongsOfLang } from './api';

const langsList = ['NTC', 'NST'];

async function saveSongsToDb(data) {
  // get the latest date from the first item
  const latestClientDate = data[(0)].date.trim();
  // the parsed latest client date in millis
  const parsedLatestClientDate = Date.parse(latestClientDate);
  const latestRef = ref.child('latestDate');

  await latestRef.set(latestClientDate);

  const newSongs = data
    .filter(song => song.Error === '0' && Date.parse(song.date) > parsedLatestClientDate)
    .map(song => ({
      id: song.code.trim(),
      lang: LANGS.get(song.langcode),
      langCode: song.langcode,
      title: song.title.trim(),
      artist: song.artist.trim(),
    }));

  const songsRef = ref.child('songs');
  const totalRef = ref.child('total');
  const totalByLangRef = ref.child('total_by_lang');

  if (newSongs.length) {
    await totalRef.transaction(cur => cur + newSongs.length);
    await latestRef.set(latestClientDate);

    const saveSongToDb = async function saveSongToDb(song) {
      await songsRef.child(song.id).set(song);
      return totalByLangRef.child(song.langCode).transaction(cur => cur + 1);
    };

    const generatePromises = function* generatePromises() {
      const progress = NyanProgress();
      progress.start({ width: 50, total: newSongs.length });
      for (let count = 0; count < newSongs.length; count += 1) {
        yield saveSongToDb(newSongs[count]);
        progress.tick();
      }
    };

    const pool = new PromisePool(generatePromises(), 10);

    return pool
      .start()
      .then(() => `Done fetching and saving ${newSongs.length} songs!`);
  }

  console.log('There is no new song to write.');
  return 'There is no new song to write.';
}

exports.handler = (event, context, callback) => (
  Promise
    .all(langsList.map(getNewSongsOfLang))
    .then(flattenArray)
    .then(saveSongsToDb)
    .then(msg => callback(null, msg))
    .then(disconnect())
);
