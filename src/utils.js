export const searchParams = params =>
  Object.keys(params)
  .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
  .join('&');

export const flattenArray = arrayOfArray => [].concat(...arrayOfArray);
