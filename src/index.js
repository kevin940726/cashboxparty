import cheerio from 'cheerio';
import fetch from 'isomorphic-fetch';
import PromisePool from 'es6-promise-pool';
import NyanProgress from 'nyan-progress';
import ref from './connect';
import LANGS from './langCode';

const searchParams = params =>
  Object
    .keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

async function getMetaData(langCode) {
  let response;
  try {
    response = await fetch(
      'http://www.cashboxparty.com/mysong/mysong_search_r.asp',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: searchParams({
          LangCode: langCode,
          // if no langCode specified than fetch all
          Chk_LangCode: langCode ? 1 : undefined,
        }),
      },
    );
  } catch (err) {
    if (err.code === 'ETIMEDOUT') {
      return getMetaData(langCode); // retry
    }
    console.error(err);
    return {};
  }
  const body = await response.text();
  const $ = cheerio.load(body);

  const meta = $('#form1 table:first-of-type tr:nth-of-type(2) td:first-of-type')
    .clone()
    .children()
    .remove()
    .end()
    .text()
    .match(/\d+/g);
  // get the number
  return {
    // // if no langCode specified than return langCode 'all'
    langCode: langCode || 'all',
    // first is total songs
    total: parseInt(meta[(0)], 10),
    // second is total pages
    pages: parseInt(meta[(1)], 10),
  };
}

async function getSongsList(page = 1) {
  let response;
  try {
    response = await fetch(
      'http://www.cashboxparty.com/mysong/MySong_Search_R.asp',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: searchParams({ Page: page, Order_Num: 10 }),
      },
    );
  } catch (err) {
    if (err.code === 'ETIMEDOUT') {
      return getSongsList(page); // retry
    }
    console.error(page);
    console.error(err);
    return [];
  }
  const body = await response.text();
  const $ = cheerio.load(body);

  const songs = $('form table:nth-of-type(2) tr')
    .slice(1)
    .map((i, song) => $(song).find('td'))
    .map(
      (i, song) =>
        ({
          id: $(song).eq(0).text().trim(),
          lang: $(song).eq(1).text().trim() || null,
          langCode: LANGS.get($(song).eq(1).text().trim()) || null,
          title: $(song).eq(2).text().trim(),
          artist: $(song).eq(3).text().trim() || null,
        }),
    )
    .toArray()
    .filter(song => song.id && song.title && song.langCode);

  return songs;
}

async function saveAllSongs() {
  const metaData = await getMetaData();
  const totalRef = ref.child('total');
  const totalByLangRef = ref.child('total_by_lang');

  let total = 0;
  const totalByLang = {};

  const songsRef = ref.child('songs');

  async function saveSongsToRef(page) {
    const songs = await getSongsList(page);
    await Promise.all(songs.map((song) => {
      total += 1;
      totalByLang[song.langCode] = (totalByLang[song.langCode] || 0) + 1;
      return songsRef.child(song.id).set(song);
    }));
  }

  const progress = NyanProgress();
  progress.start({ width: 50, total: metaData.pages, curr: 1 });

  function* generatePromises() {
    for (let page = 1; page <= metaData.pages; page += 1) {
      progress.tick();
      yield saveSongsToRef(page);
    }
  }

  const pool = new PromisePool(generatePromises(), 10);
  await pool.start();

  await totalRef.set(total);
  await totalByLangRef.set(totalByLang);

  console.log(`Done fetching and saving ${total} songs!`);
}

saveAllSongs();
