const axios = require('axios');

const FTU_BASE_URL = 'https://api.freetouse.com/v3';
const CACHE_TTL_MS = 15 * 60 * 1000;
let tracksCache = null;
let tracksCacheTime = 0;

const formatSeconds = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const mapFtuTrack = (track) => {
  const artistObj = Array.isArray(track.artists?.[0]) ? track.artists[0][1] : track.artists?.[0];
  const artistName = artistObj?.name || track.record_label || 'Free To Use';
  const audioUrl = track.files?.mp3 || '';
  const thumbnail = track.thumbnails?.lg || track.thumbnails?.md || track.thumbnails?.sm || '';

  return {
    videoId: `ftu-${track.id}`,
    title: track.title,
    artist: artistName,
    duration: formatSeconds(track.duration),
    thumbnail,
    audioUrl,
    downloadUrl: audioUrl,
    downloadable: Boolean(audioUrl),
    source: 'freetouse',
    sourceType: 'direct-audio',
    genre: track.genre || 'Various',
    license: 'Royalty-free music (Free To Use)',
  };
};

const fetchAllFtuTracks = async () => {
  if (tracksCache && Date.now() - tracksCacheTime < CACHE_TTL_MS) {
    return tracksCache;
  }
  try {
    const res = await axios.get(`${FTU_BASE_URL}/music/tracks/all`, {
      params: { limit: 50 },
      timeout: 10000,
      headers: { Accept: 'application/json', 'User-Agent': 'VibeTube/1.0' },
    });
    const rawTracks = Array.isArray(res.data?.data) ? res.data.data : [];
    const mapped = rawTracks
      .map(mapFtuTrack)
      .filter(t => t.audioUrl && t.downloadable);
    tracksCache = mapped;
    tracksCacheTime = Date.now();
    return mapped;
  } catch (error) {
    console.error('Free To Use API request failed:', error.message);
    return tracksCache || [];
  }
};

const getDownloadableTracks = async ({ limit = 20, genre = '' } = {}) => {
  const allTracks = await fetchAllFtuTracks();
  let results = allTracks;
  if (genre) {
    const g = genre.toLowerCase();
    results = results.filter(t => (t.genre || '').toLowerCase().includes(g));
  }
  return results.slice(0, Number(limit) || 20);
};

const searchDownloadableTracks = async (query, { limit = 20 } = {}) => {
  const q = String(query || '').toLowerCase().trim();
  const allTracks = await fetchAllFtuTracks();
  if (!q) return allTracks.slice(0, limit);

  const filtered = allTracks.filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.artist.toLowerCase().includes(q) ||
    t.genre.toLowerCase().includes(q)
  );
  return filtered.slice(0, Number(limit) || 20);
};

module.exports = {
  getDownloadableTracks,
  searchDownloadableTracks,
};
