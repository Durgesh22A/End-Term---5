const axios = require('axios');
const { getLyrics } = require('./lyricsService');

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';
const PLACEHOLDER_KEY = 'your_youtube_data_api_v3_key';

/**
 * DEMO DATA — used when YOUTUBE_API_KEY is not set or quota is exhausted.
 * This keeps the UI functional for grading/demos without burning API quota.
 * Each entry is a real YouTube music video ID you can verify.
 */
const DEMO_SONGS = [
  { videoId: 'JGwWNGJdvx8', title: 'Shape of You', artist: 'Ed Sheeran', thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg', duration: '3:54', genre: 'Pop' },
  { videoId: 'kTJczUoc26U', title: 'Starboy', artist: 'The Weeknd', thumbnail: 'https://img.youtube.com/vi/kTJczUoc26U/mqdefault.jpg', duration: '3:50', genre: 'R&B' },
  { videoId: 'OPf0YbXqDm0', title: 'Mark Ronson - Uptown Funk', artist: 'Bruno Mars', thumbnail: 'https://img.youtube.com/vi/OPf0YbXqDm0/mqdefault.jpg', duration: '4:00', genre: 'Funk' },
  { videoId: 'RgKAFK5djSk', title: 'See You Again', artist: 'Wiz Khalifa', thumbnail: 'https://img.youtube.com/vi/RgKAFK5djSk/mqdefault.jpg', duration: '3:56', genre: 'Hip-Hop' },
  { videoId: 'hT_nvWreIhg', title: 'Counting Stars', artist: 'OneRepublic', thumbnail: 'https://img.youtube.com/vi/hT_nvWreIhg/mqdefault.jpg', duration: '4:17', genre: 'Pop' },
  { videoId: 'CevxZvSJLk8', title: 'Roar', artist: 'Katy Perry', thumbnail: 'https://img.youtube.com/vi/CevxZvSJLk8/mqdefault.jpg', duration: '3:43', genre: 'Pop' },
  { videoId: 'e-ORhEE9VVg', title: 'Locked Out of Heaven', artist: 'Bruno Mars', thumbnail: 'https://img.youtube.com/vi/e-ORhEE9VVg/mqdefault.jpg', duration: '3:53', genre: 'Pop-Rock' },
  { videoId: 'PT2_F-1esPk', title: 'Waka Waka', artist: 'Shakira', thumbnail: 'https://img.youtube.com/vi/PT2_F-1esPk/mqdefault.jpg', duration: '3:33', genre: 'Latin' },
  { videoId: '09R8_2nJtjg', title: 'Sugar', artist: 'Maroon 5', thumbnail: 'https://img.youtube.com/vi/09R8_2nJtjg/mqdefault.jpg', duration: '3:55', genre: 'Pop' },
  { videoId: 'SlPhMPnQ58k', title: 'Lean On', artist: 'Major Lazer', thumbnail: 'https://img.youtube.com/vi/SlPhMPnQ58k/mqdefault.jpg', duration: '2:42', genre: 'Electronic' },
  { videoId: '450p7goxZqg', title: 'Happier', artist: 'Marshmello & Bastille', thumbnail: 'https://img.youtube.com/vi/450p7goxZqg/mqdefault.jpg', duration: '3:35', genre: 'Electronic' },
  { videoId: 'pRpeEdMmmQ0', title: 'Shake It Off', artist: 'Taylor Swift', thumbnail: 'https://img.youtube.com/vi/pRpeEdMmmQ0/mqdefault.jpg', duration: '3:39', genre: 'Pop' },
];

/** Read at call time so dotenv path fixes apply even if this file was cached. Never log this. */
const getApiKey = () => process.env.YOUTUBE_API_KEY;

const isDemoMode = () => {
  const key = getApiKey();
  return !key || key === PLACEHOLDER_KEY;
};

const pack = (results, extra = {}) => ({
  results,
  isDemo: extra.isDemo ?? isDemoMode(),
  fallbackReason: extra.fallbackReason || null,
});

/**
 * Convert YouTube API duration (ISO 8601: PT3M54S) to "3:54"
 */
const formatDuration = (iso) => {
  if (!iso) return '';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const h = parseInt(match[1] || 0);
  const m = parseInt(match[2] || 0);
  const s = parseInt(match[3] || 0);
  const mm = h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}`;
  return `${mm}:${String(s).padStart(2, '0')}`;
};

/**
 * decodeHtml — YouTube API returns HTML entities in titles (e.g., &#39; → ')
 * We decode them server-side so the frontend shows clean text.
 */
const decodeHtml = (str) => {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
};

/**
 * Map a YouTube API video item to our standard song shape.
 * We normalize here so the rest of the codebase doesn't know about YouTube's format.
 */
const mapVideoItem = (item) => ({
  videoId: item.id?.videoId || (typeof item.id === 'string' ? item.id : ''),
  sourceType: 'youtube-embed',
  downloadable: false,
  downloadReason: 'YouTube video and embed URLs are not downloadable audio files.',
  title: decodeHtml(item.snippet?.title || ''),
  artist: decodeHtml(item.snippet?.channelTitle || ''),
  thumbnail: (() => {
    const videoId = item.id?.videoId || (typeof item.id === 'string' ? item.id : '');
    return videoId
      ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
      : item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '';
  })(),
  duration: item.contentDetails ? formatDuration(item.contentDetails.duration) : '',
  publishedAt: item.snippet?.publishedAt,
  description: decodeHtml(item.snippet?.description || ''),
  viewCount: item.statistics?.viewCount,
  likeCount: item.statistics?.likeCount,
  embeddable: item.status?.embeddable,
});

/**
 * handleYTError — maps YouTube API error codes to friendly messages.
 *
 * WHY bother? YouTube returns 403 for many different reasons:
 *   - quotaExceeded: you've used all 10,000 quota units for the day
 *   - forbidden: key is invalid or doesn't have the API enabled
 * Without this, all of these would show a generic 500 to the user.
 */
const handleYTError = (error, fallbackResults = null) => {
  const ytErr = error.response?.data?.error;

  if (ytErr) {
    const reason = ytErr.errors?.[0]?.reason || '';
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
      console.warn('YouTube API quota exceeded — falling back to demo data');
      if (fallbackResults !== null) {
        return pack(fallbackResults, { isDemo: true, fallbackReason: 'quota' });
      }

      const err = new Error('YouTube API daily quota exceeded. Demo data is showing instead.');
      err.statusCode = 429;
      throw err;
    }
    if (reason === 'keyInvalid' || reason === 'accessNotConfigured') {
      const err = new Error('YouTube API key is invalid or the YouTube Data API v3 is not enabled.');
      err.statusCode = 500;
      throw err;
    }
  }

  if (error.response?.status === 429) {
    const err = new Error('YouTube is rate-limiting requests. Please wait before searching again.');
    err.statusCode = 429;
    err.retryAfter = error.response.headers?.['retry-after'];
    throw err;
  }

  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    const err = new Error('Cannot reach YouTube API. Check your internet connection.');
    err.statusCode = 503;
    throw err;
  }

  throw error;
};

const searchVideos = async (query, maxResults = 10) => {
  if (isDemoMode()) {
    const q = query.toLowerCase();
    const filtered = DEMO_SONGS.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      (s.genre && s.genre.toLowerCase().includes(q))
    );
    const results = (filtered.length ? filtered : DEMO_SONGS).slice(0, maxResults);
    return pack(results, { isDemo: true, fallbackReason: 'missing_key' });
  }

  try {
    const searchRes = await axios.get(`${YT_API_BASE}/search`, {
      params: {
        part: 'snippet',
        q: `${query} music`,
        type: 'video',
        videoCategoryId: '10', // Music category
        maxResults,
        key: getApiKey(),
      },
    });

    const items = (searchRes.data.items || []).filter(i => i.id?.videoId);
    const videoIds = items.map(i => i.id.videoId).join(',');

    let detailsMap = {};
    if (videoIds) {
      const detailsRes = await axios.get(`${YT_API_BASE}/videos`, {
        params: { part: 'contentDetails,statistics,status', id: videoIds, key: getApiKey() },
      });
      (detailsRes.data.items || []).forEach(v => { detailsMap[v.id] = v; });
    }

    const results = items.map(item => ({
      ...mapVideoItem(item),
      duration: formatDuration(detailsMap[item.id.videoId]?.contentDetails?.duration),
      embeddable: detailsMap[item.id.videoId]?.status?.embeddable,
    })).filter(s => s.videoId && s.embeddable !== false);

    return pack(results, { isDemo: false });
  } catch (error) {
    return handleYTError(error, DEMO_SONGS.slice(0, maxResults));
  }
};

const getTrendingMusic = async (maxResults = 20) => {
  if (isDemoMode()) {
    const shuffled = [...DEMO_SONGS].sort(() => Math.random() - 0.5);
    return pack(shuffled.slice(0, maxResults), { isDemo: true, fallbackReason: 'missing_key' });
  }

  try {
    const res = await axios.get(`${YT_API_BASE}/videos`, {
      params: {
        part: 'snippet,contentDetails,statistics,status',
        chart: 'mostPopular',
        videoCategoryId: '10',
        maxResults,
        regionCode: 'IN',
        key: getApiKey(),
      },
    });
    const seen = new Set();
    const results = (res.data.items || [])
      .map(mapVideoItem)
      .filter(s => s.videoId && s.embeddable !== false && !seen.has(s.videoId) && seen.add(s.videoId));
    return pack(results, { isDemo: false });
  } catch (error) {
    return handleYTError(error, DEMO_SONGS);
  }
};

const getVideoDetails = async (videoId) => {
  if (isDemoMode()) {
    return DEMO_SONGS.find(s => s.videoId === videoId) || null;
  }

  try {
    const res = await axios.get(`${YT_API_BASE}/videos`, {
      params: {
        part: 'snippet,contentDetails,statistics,status',
        id: videoId,
        key: getApiKey(),
      },
    });
    if (!res.data.items.length) return null;
    const video = mapVideoItem(res.data.items[0]);
    return { ...video, embeddable: res.data.items[0].status?.embeddable };
  } catch (error) {
    const packed = handleYTError(error, null);
    if (packed && packed.results) return packed.results[0] || null;
    return null;
  }
};

const searchByArtist = async (artistName, maxResults = 10) => {
  if (isDemoMode()) {
    const filtered = DEMO_SONGS.filter(s =>
      s.artist.toLowerCase().includes(artistName.toLowerCase())
    );
    const results = (filtered.length ? filtered : DEMO_SONGS).slice(0, maxResults);
    return pack(results, { isDemo: true, fallbackReason: 'missing_key' });
  }

  return searchVideos(`${artistName} songs`, maxResults);
};

module.exports = {
  searchVideos,
  getTrendingMusic,
  getVideoDetails,
  searchByArtist,
  isDemoMode,
  getLyrics,
  DEMO_SONGS,
};
