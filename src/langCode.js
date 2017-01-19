const langCode = [
  { langCode: '1', lang: '國語' },
  { langCode: '2', lang: '台語' },
  { langCode: '3', lang: '粵語' },
  { langCode: '4', lang: '英語' },
  { langCode: '5', lang: '客語' },
  { langCode: '6', lang: '韓語' },
  { langCode: '7', lang: '兒歌' },
  { langCode: '8', lang: '日語' },
  { langCode: '9', lang: '義大利' },
];

langCode.get = function get(key) {
  // '1' -> 1, '國語' -> NaN
  const code = parseInt(key, 10);
  let result;

  /* obj['1'] === '國語'
   * obj['國語'] === '1'
   * obj[1] === {}
   */
  if (code) {
    result = this.find(e => e.langCode === key);
    if (result) {
      return result.lang;
    }
  } else {
    result = this.find(e => e.lang === key);
    if (result) {
      return result.langCode;
    }
  }

  return undefined; // no match
};

export default langCode;
