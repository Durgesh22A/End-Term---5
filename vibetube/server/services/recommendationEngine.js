const ListeningHistory = require('../models/ListeningHistory');
const User = require('../models/User');
const { searchVideos, DEMO_SONGS, isDemoMode } = require('./youtubeService');

/**
 * RECOMMENDATION ENGINE — explainable, lightweight, no ML library needed.
 *
 * Algorithm:
 * 1. Extract top artists from listening history (play frequency)
 * 2. Extract top genres from listening history
 * 3. Extract liked artists from likedSongs
 * 4. Score and merge: artist matches > liked artist matches > genre matches
 * 5. Exclude songs already in history (de-duplicate)
 * 6. Fall back to trending demo songs if not enough results
 *
 * WHY this approach?
 *   - Explainable: we can tell the user "because you listen to Ed Sheeran"
 *   - No ML library: works without training data
 *   - Incremental: gets better as the user listens more
 */
const getRecommendations = async (userId, limit = 20) => {
  if (!userId) {
    return {
      recommendations: DEMO_SONGS.slice(0, limit),
      reason: 'Trending tracks for you',
    };
  }
  // ── Step 1: Gather user data ─────────────────────────────────────────────

  const [history, user] = await Promise.all([
    ListeningHistory.find({ user: userId })
      .sort({ playedAt: -1 })
      .limit(100),
    User.findById(userId).select('likedSongs'),
  ]);

  const playedVideoIds = new Set(history.map(h => h.videoId));

  // ── Step 2: Build frequency maps ─────────────────────────────────────────
  const artistFreq = {};
  const genreFreq = {};

  history.forEach(entry => {
    if (entry.artist) artistFreq[entry.artist] = (artistFreq[entry.artist] || 0) + 1;
    if (entry.genre)  genreFreq[entry.genre]   = (genreFreq[entry.genre]   || 0) + 1;
  });

  user.likedSongs.forEach(song => {
    if (song.artist) artistFreq[song.artist] = (artistFreq[song.artist] || 0) + 2; // Likes weigh 2x
  });

  // Sort by frequency, take top 3 of each
  const topArtists = Object.entries(artistFreq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
  const topGenres  = Object.entries(genreFreq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

  // ── Step 3: Build explanation string ─────────────────────────────────────
  let reason = 'Based on trending music';
  if (topArtists.length) reason = `Because you listen to ${topArtists.slice(0, 2).join(' & ')}`;
  else if (topGenres.length) reason = `Based on your ${topGenres[0]} taste`;

  // ── Step 4: Fetch candidates ──────────────────────────────────────────────
  let candidates = [];

  if (isDemoMode()) {
    // In demo mode, filter demo songs by matching artists/genres
    candidates = DEMO_SONGS.filter(song => {
      const artistMatch = topArtists.some(a => song.artist?.toLowerCase().includes(a.toLowerCase()));
      const genreMatch  = topGenres.some(g => song.genre?.toLowerCase().includes(g.toLowerCase()));
      return artistMatch || genreMatch;
    });

    // If no matches (new user), return shuffled demo songs
    if (!candidates.length) {
      candidates = [...DEMO_SONGS].sort(() => Math.random() - 0.5);
    }
  } else {
    // With real API: search for top artist + top genre
    const queries = [];
    if (topArtists[0]) queries.push(searchVideos(topArtists[0], 10));
    if (topArtists[1]) queries.push(searchVideos(topArtists[1], 8));
    if (topGenres[0])  queries.push(searchVideos(`${topGenres[0]} music`, 6));

    if (!queries.length) queries.push(searchVideos('top music 2024', 20));

    const results = await Promise.allSettled(queries);
    results.forEach(r => {
      if (r.status === 'fulfilled') {
        const songs = r.value.results || r.value;
        if (Array.isArray(songs)) candidates.push(...songs);
      }
    });
  }

  // ── Step 5: De-duplicate and filter already played ────────────────────────
  const seen = new Set();
  const recs = candidates
    .filter(song => {
      if (playedVideoIds.has(song.videoId)) return false;
      if (seen.has(song.videoId)) return false;
      seen.add(song.videoId);
      return true;
    })
    .sort(() => Math.random() - 0.5)
    .slice(0, limit);

  if (!recs.length && isDemoMode()) {
    const unseenFallback = DEMO_SONGS.filter(song => !playedVideoIds.has(song.videoId));
    const fallback = [...(unseenFallback.length ? unseenFallback : DEMO_SONGS)].sort(() => Math.random() - 0.5);
    return {
      recommendations: fallback.slice(0, limit),
      reason: unseenFallback.length ? 'Fresh picks from trending music' : 'Based on trending music',
    };
  }

  return { recommendations: recs, reason };
};

module.exports = { getRecommendations };
