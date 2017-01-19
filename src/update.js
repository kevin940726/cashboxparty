import fetch from 'isomorphic-fetch';
import NyanProgress from 'nyan-progress';
import PromisePool from 'es6-promise-pool';
import ref from './connect';
import LANGS from './langCode';
import { flattenArray } from './utils';

const API_URI = 'http://mobileappv2plus.cashboxparty.com/WebService/SongService.asmx/SelectNewSongByLanguageTypeOrderByReleaseDate';

const langsList = ['NTC', 'NST'];

async function getNewSongsOfLang(lang) {
  let response;
  try {
    response = await fetch(API_URI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Referer: 'http://mobileappv2plus.cashboxparty.com/Song/SongIndexV2.aspx',
      },
      body: `{languageType : '${lang}' }`,
    });
  } catch (err) {
    if (err.code === 'ETIMEDOUT') {
      return getNewSongsOfLang(lang); // retry if timeout
    }
    console.error(err);
    return [];
  }

  // convert to json
  response = await response.json();
  if (response) {
    // get the 'd' property
    response = response.d;
  }

  // parse to json
  const data = JSON.parse(response);

  return data;
}

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
      .then(() => console.log(`Done fetching and saving ${newSongs.length} songs!`));
  }

  console.log('There is no new song to write.');
  return null;
}

Promise
  .all(langsList.map(getNewSongsOfLang))
  .then(flattenArray)
  .then(saveSongsToDb);
