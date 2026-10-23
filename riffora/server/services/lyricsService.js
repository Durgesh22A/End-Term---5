const axios = require('axios');

const LRCLIB_BASE_URL = 'https://lrclib.net/api';
const CACHE_TTL_MS = 60 * 60 * 1000;
const lyricsCache = new Map();

const RECORD_LABELS = /(?:t-series|sony\s*music|zee\s*music|yrf|tips|saregama|speed\s*records|eros\s*now|universal\s*music|warner|vevo|records|channel|music\s*company|official\s*channel|worldwide\s*records)/i;

const normalize = (value = '') => String(value)
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tokens = (value) => new Set(normalize(value).split(' ').filter((token) => token.length > 1));

const tokenOverlap = (requested, candidate) => {
  const expected = tokens(requested);
  const actual = tokens(candidate);
  if (!expected.size || !actual.size) return 0;
  let matches = 0;
  expected.forEach((token) => {
    if (actual.has(token)) matches += 1;
  });
  return matches / expected.size;
};

const cleanMusicNoise = (str) => String(str || '')
  .replace(/#\S+/g, '')
  .replace(/\s*[\(\[][^\)\]]*(?:video|audio|visualizer|lyric|official|hd|4k|hq|remix|extended|full|version|edit|clip|prod|mv)[^\)\]]*[\)\]]/gi, '')
  .replace(/\s*[\(\[](?:official\s*(?:video|audio|music\s*video|visualizer|lyric\s*video|hd|4k)?|audio|lyrics?|visualizer|hd|4k|hq)[\)\]]/gi, '')
  .replace(/^\s*(?:full\s*video\s*[:|]|full\s*song\s*[:|]|video\s*song\s*[:|]|official\s*video\s*[:|]|lyrical\s*[:|]|audio\s*[:|])\s*/gi, '')
  .replace(/\s*ft\.?\s+.*$/i, '')
  .replace(/\s*feat\.?\s+.*$/i, '')
  .trim();

const extractCandidates = (rawTitle, rawArtist) => {
  let cleaned = cleanMusicNoise(rawTitle);

  let cleanArtist = String(rawArtist || '')
    .replace(/\s*-\s*topic$/i, '')
    .replace(/vevo$/i, '')
    .replace(/official$/i, '')
    .trim();
  cleanArtist = cleanArtist.replace(/([a-z])([A-Z])/g, '$1 $2').trim();

  const isLabel = RECORD_LABELS.test(cleanArtist);

  const titleCandidates = [];
  const artistCandidates = [];
  if (cleanArtist && !isLabel) {
    artistCandidates.push(cleanArtist);
  }

  // Split by pipe '|'
  const pipeParts = cleaned.split('|').map((p) => p.trim()).filter(Boolean);
  const mainSegment = pipeParts[0] || cleaned;

  for (let i = 1; i < pipeParts.length; i += 1) {
    const sub = pipeParts[i];
    sub.split(/[,&]/).forEach((a) => {
      const trimmed = a.trim();
      if (trimmed.length > 2 && !RECORD_LABELS.test(trimmed)) {
        artistCandidates.push(trimmed);
      }
    });
  }

  // If artist is known and in the main segment, isolate the track title
  if (cleanArtist && !isLabel) {
    const escapedArtist = cleanArtist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const withoutArtist = mainSegment
      .replace(new RegExp(`\\b${escapedArtist}\\b`, 'gi'), '')
      .replace(/^[-\s|]+|[-\s|]+$/g, '')
      .trim();
    if (withoutArtist && withoutArtist.length > 0 && withoutArtist !== mainSegment) {
      titleCandidates.push(withoutArtist);
    }
  }

  if (mainSegment.includes(' - ')) {
    const [left, ...rest] = mainSegment.split(' - ');
    const right = rest.join(' - ').trim();
    const normLeft = normalize(left);
    const normRight = normalize(right);
    const normArtist = normalize(cleanArtist);
    const stripSpaces = (s) => normalize(s).replace(/\s+/g, '');
    const isArtistLeft = normArtist && (normArtist === normLeft || stripSpaces(cleanArtist) === stripSpaces(left) || normLeft.includes(normArtist) || normArtist.includes(normLeft));
    const isArtistRight = normArtist && (normArtist === normRight || stripSpaces(cleanArtist) === stripSpaces(right) || normRight.includes(normArtist) || normArtist.includes(normRight));

    if (isArtistLeft) {
      titleCandidates.push(right);
      artistCandidates.unshift(left);
    } else if (isArtistRight) {
      titleCandidates.push(left);
      artistCandidates.unshift(right);
    } else {
      titleCandidates.push(left, right, mainSegment);
    }
  } else {
    titleCandidates.push(mainSegment);
  }

  return {
    titles: [...new Set(titleCandidates.map((t) => t.trim()).filter(Boolean))],
    artists: [...new Set(artistCandidates.map((a) => a.trim()).filter(Boolean))],
    isLabel,
    primaryTitle: titleCandidates[0] || cleaned,
    primaryArtist: artistCandidates[0] || cleanArtist,
  };
};

const parseLrc = (value = '') => String(value)
  .split(/\r?\n/)
  .flatMap((line) => {
    const matches = [...line.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    const text = line.replace(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g, '').trim();
    return matches
      .map((match) => {
        const fraction = match[3] ? Number(`0.${match[3]}`) : 0;
        const time = (Number(match[1]) * 60) + Number(match[2]) + fraction;
        return text ? { time, text } : null;
      })
      .filter(Boolean);
  })
  .sort((a, b) => a.time - b.time);

const toResult = (track) => {
  const syncedLyrics = parseLrc(track.syncedLyrics || '');
  const lyrics = typeof track.plainLyrics === 'string' ? track.plainLyrics.trim() : '';
  return {
    status: lyrics || syncedLyrics.length ? 'available' : 'unavailable',
    lyrics,
    syncedLyrics,
    synchronized: syncedLyrics.length > 0,
    message: lyrics || syncedLyrics.length ? '' : 'No lyrics were found for this song.',
    provider: 'LRCLIB',
  };
};

const getLyrics = async (title, artist) => {
  const { titles, artists, isLabel, primaryTitle, primaryArtist } = extractCandidates(title, artist);
  const cacheKey = `${normalize(title)}|${normalize(artist)}`;
  const cached = lyricsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) lyricsCache.delete(cacheKey);

  const headers = { Accept: 'application/json', 'User-Agent': 'RIFFORA/1.0 (https://github.com/Durgesh22A/End-Term---5)' };

  // 1. Try exact lookup via /api/get if clean title & artist are found
  if (primaryTitle && primaryArtist && !isLabel) {
    try {
      const getRes = await axios.get(`${LRCLIB_BASE_URL}/get`, {
        params: { track_name: primaryTitle, artist_name: primaryArtist },
        timeout: 5000,
        headers,
      });
      if (getRes.data && (getRes.data.plainLyrics || getRes.data.syncedLyrics)) {
        const result = toResult(getRes.data);
        lyricsCache.set(cacheKey, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
        return result;
      }
    } catch (e) {
      if (e.response?.status === 429) {
        return { status: 'error', lyrics: '', syncedLyrics: [], message: 'Lyrics service is rate-limited. Try again later.' };
      }
    }
  }

  // 2. Generate search queries
  const queries = [];
  titles.forEach((t) => {
    artists.forEach((a) => queries.push(`${t} ${a}`));
  });
  titles.forEach((t) => queries.push(t));

  const uniqueQueries = [...new Set(queries)].slice(0, 5);

  let bestMatch = null;
  let bestScore = -1;

  for (const q of uniqueQueries) {
    try {
      const response = await axios.get(`${LRCLIB_BASE_URL}/search`, {
        params: { q, limit: 8 },
        timeout: 6000,
        headers,
      });
      const hits = Array.isArray(response.data) ? response.data : [];
      for (const hit of hits) {
        if (!hit.syncedLyrics && !hit.plainLyrics) continue;
        const rawHitTitle = hit.trackName || '';
        const cleanedHitTitle = cleanMusicNoise(rawHitTitle).split('|')[0].trim();
        const hitArtist = hit.artistName || '';

        let maxTitleMatch = 0;
        for (const t of titles) {
          const matchRaw = Math.max(tokenOverlap(t, rawHitTitle), tokenOverlap(rawHitTitle, t));
          const matchClean = Math.max(tokenOverlap(t, cleanedHitTitle), tokenOverlap(cleanedHitTitle, t));
          const match = Math.max(matchRaw, matchClean);
          if (match > maxTitleMatch) maxTitleMatch = match;
        }

        if (maxTitleMatch < 0.65) continue;

        let maxArtistMatch = 0;
        if (artists.length === 0 || isLabel) {
          maxArtistMatch = tokenOverlap(title, hitArtist) > 0.3 ? 0.8 : 0.5;
        } else {
          for (const a of artists) {
            const match = Math.max(tokenOverlap(a, hitArtist), tokenOverlap(hitArtist, a));
            if (match > maxArtistMatch) maxArtistMatch = match;
          }
        }

        const score = (maxTitleMatch * 2) + maxArtistMatch;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = hit;
        }
      }

      if (bestMatch && bestScore >= 2.2) {
        break; // High confidence match found
      }
    } catch (error) {
      if (error.response?.status === 429) {
        return { status: 'error', lyrics: '', syncedLyrics: [], message: 'Lyrics service is rate-limited. Try again later.' };
      }
    }
  }

  if (bestMatch) {
    const result = toResult(bestMatch);
    if (result.status === 'available') {
      lyricsCache.set(cacheKey, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
      return result;
    }
  }

  const notFoundResult = {
    status: 'unavailable',
    lyrics: '',
    syncedLyrics: [],
    synchronized: false,
    message: 'No verified lyrics were found for this song.',
    provider: 'LRCLIB',
  };
  lyricsCache.set(cacheKey, { value: notFoundResult, expiresAt: Date.now() + (10 * 60 * 1000) });
  return notFoundResult;
};

module.exports = { getLyrics, parseLrc };
