import cheerio from 'cheerio'
import fetch from 'isomorphic-fetch'
import PromisePool from 'es6-promise-pool'
import ref from './connect'
import LANGS from './langCode'

const searchParams = params => Object.keys(params).map(key => (
  encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
)).join('&')

const getMetaData = async function (langCode = '1') {
  let response
  try {
    response = await fetch('http://www.cashboxparty.com/mysong/mysong_search_r.asp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: searchParams({
        LangCode: langCode,
        Chk_LangCode: 1
      })
    })
  } catch (err) {
    if (err.code === 'ETIMEDOUT') {
      return getMetaData(langCode) // retry
    }
    console.error(err)
    return {}
  }
  const body = await response.text()
  const $ = cheerio.load(body)

  const meta = $('#form1 table:first-of-type tr:nth-of-type(2) td:first-of-type')
    .clone()    // clone the element
    .children() // select all the children
    .remove()   // remove all the children
    .end()  // again go back to selected element
    .text() // get the meta text
    .match(/\d+/g) // get the number

  return {
    langCode,
    total: parseInt(meta[0], 10), // first is total songs
    pages: parseInt(meta[1], 10) // second is total pages
  }
}

const getSongsList = async function (langCode = '1', page = 1) {
  let response
  try {
    response = await fetch('http://www.cashboxparty.com/mysong/MySong_Search_R.asp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: searchParams({
        LangCode: langCode,
        Chk_LangCode: 1,
        Page: page,
        Order_Num: 10
      })
    })
  } catch (err) {
    if (err.code === 'ETIMEDOUT') {
      return getSongsList(langCode, page) // retry
    }
    console.error(langCode, page)
    console.error(err)
    return []
  }
  const body = await response.text()
  const $ = cheerio.load(body)

  const songs = $('form table:nth-of-type(2) tr')
    .slice(1)
    .map((i, song) => $(song).find('td'))
    .map((i, song) => ({
      id: $(song).eq(0).text().trim(),
      lang: $(song).eq(1).text().trim(),
      langCode,
      title: $(song).eq(2).text().trim(),
      artist: $(song).eq(3).text().trim()
    }))
    .toArray()

  return songs
}

const saveSongsOfLang = async function (langCode = '1') {
  const metaData = await getMetaData(langCode)
  const metaRef = ref.child('metaData').child(metaData.langCode)
  metaRef.set(metaData)

  const songsRef = ref.child('songs')

  const saveSongsToRef = async function (page) {
    const songs = await getSongsList(langCode, page)
    for (let song of songs) {
      songsRef.child(song.id).set(song)
    }
  }

  const generatePromises = function* () {
    for (let page = 1; page <= metaData.pages; page++) {
      yield saveSongsToRef(page)
    }
  }
  const pool = new PromisePool(generatePromises(), 10)

  return pool.start()
    .then(() => console.log(`Lang ${LANGS.get(langCode)} done fetching!`))
    .catch(console.error)
}

for (let { langCode } of LANGS) {
  saveSongsOfLang(langCode)
}
// require('./checkNewSongs')
