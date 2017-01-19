import fetch from 'isomorphic-fetch'
import NyanProgress from 'nyan-progress'
import PromisePool from 'es6-promise-pool'
import ref from './connect'
import LANGS from './langCode'

const API_URI = 'http://mobileappv2plus.cashboxparty.com/WebService/SongService.asmx/SelectNewSongByLanguageTypeOrderByReleaseDate'

const langsList = ['NTC', 'NST']

async function getNewSongsOfLang (lang) {
  let response
  try {
    response = await fetch(API_URI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Referer': 'http://mobileappv2plus.cashboxparty.com/Song/SongIndexV2.aspx'
      },
      body: `{languageType : '${lang}' }`
    })
  } catch (err) {
    if (err.code === 'ETIMEDOUT') {
      return getNewSongsOfLang(lang) // retry if timeout
    }
    console.error(err)
    return []
  }
  response = await response.json() // convert to json
  if (response) response = response.d // get the 'd' property
  const data = JSON.parse(response) // parse to json

  return data
}

async function saveSongsToDb (data) {
  const latestClientDate = data[0].date.trim() // get the latest date from the first item
  const parsedLatestClientDate = Date.parse(latestClientDate) // the parsed latest client date in millis

  const latestRef = ref.child('latestDate')

  await latestRef.set(latestClientDate)

  const newSongs = data
    .filter(song => song.Error === '0' && Date.parse(song.date) > parsedLatestClientDate)
    .map(song => ({
      id: song.code.trim(),
      lang: LANGS.get(song.langcode),
      langCode: song.langcode,
      title: song.title.trim(),
      artist: song.artist.trim()
    }))

  const songsRef = ref.child('songs')
  const totalRef = ref.child('total')
  const totalByLangRef = ref.child('total_by_lang')

  if (newSongs.length) {
    await totalRef.transaction(cur => cur + newSongs.length)
    await latestRef.set(latestClientDate)

    const saveSongToDb = async function (song) {
      await songsRef.child(song.id).set(song)
      await totalByLangRef.child(song.langCode).transaction(cur => cur + 1)
    }

    const generatePromises = function* () {
      const progress = NyanProgress()
      progress.start({ width: 50, total: newSongs.length })
      for (let count = 0; count < newSongs.length; count++) {
        yield saveSongToDb(newSongs[count])
        progress.tick()
      }
    }

    const pool = new PromisePool(generatePromises(), 10)

    return pool.start()
      .then(() => console.log(`Done fetching and saving ${newSongs.length} songs!`))
  } else {
    console.log('There is no new song to write.')
  }
}

const flattenArray = arrayOfArray => [].concat(...arrayOfArray)

Promise.all(langsList.map(getNewSongsOfLang))
  .then(flattenArray)
  .then(saveSongsToDb)

// export default checkNewSongs
