import fetch from 'isomorphic-fetch';

const API_ORIGIN = 'http://mobileappv2plus.cashboxparty.com/WebService/SongService.asmx';

async function createFetch(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Referer: 'http://mobileappv2plus.cashboxparty.com/Song/SongIndexV2.aspx',
      },
      body,
    });
  } catch (err) {
    if (err.code === 'ETIMEDOUT') {
      return this.call(this, url, body); // retry if timeout
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

const getAPI = (method, lang) => createFetch(
  `${API_ORIGIN}/${method}`,
  `{languageType : '${lang}' }`,
);

export const getNewSongsOfLang = lang => getAPI(
  'SelectNewSongByLanguageTypeOrderByReleaseDate',
  lang,
);

export const getTopNewSongsOfLang = lang => getAPI(
  'SelectTopNewSongsForAppV3',
  lang,
);

export const getTopRadioSongsOfLang = lang => getAPI(
  // there are two different apis for different languages,
  (lang === 'CTC' || lang === 'CTT') ? 'SelectTopRadioSongsForAppV3' : 'SelectTopRadioForiegnSongsForApp',
  lang,
);

export const searchSongs = options => createFetch(
  'http://mobileappv2plus.cashboxparty.com/WebService/SongService.asmx/SearchSongsV2',
  JSON.stringify({
    singerName: options.artist || '',
    songName: options.title || '',
    languageType: options.langCode || '0',
    wordLen: options.lenOfWord || '0',
  }),
);
