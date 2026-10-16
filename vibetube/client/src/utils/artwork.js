const YOUTUBE_IMAGE_HOSTS = new Set(['img.youtube.com', 'i.ytimg.com']);

const getYouTubeIdFromUrl = (value) => {
  try {
    const url = new URL(value);
    if (!YOUTUBE_IMAGE_HOSTS.has(url.hostname)) return '';
    const match = url.pathname.match(/\/vi\/([^/]+)\//);
    return match?.[1] || '';
  } catch {
    return '';
  }
};

const isYouTubeId = (id) => (
  typeof id === 'string' &&
  /^[A-Za-z0-9_-]{11}$/.test(id) &&
  !id.startsWith('jamendo-') &&
  !id.startsWith('ftu-') &&
  !id.startsWith('local-')
);

const getYouTubeId = (song) => {
  if (isYouTubeId(song?.videoId)) return song.videoId;
  return getYouTubeIdFromUrl(song?.thumbnail);
};

const getVariantUrl = (videoId, variant) => (
  videoId ? `https://i.ytimg.com/vi/${videoId}/${variant}.jpg` : ''
);

export const getArtworkCandidates = (song, size = 'card') => {
  const source = typeof song?.thumbnail === 'string' ? song.thumbnail.trim() : '';
  const isDirectNonYouTube = source && !source.includes('ytimg.com') && !source.includes('youtube.com');
  const videoId = getYouTubeId(song);

  const youtubeCandidates = videoId
    ? ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'].map(variant => getVariantUrl(videoId, variant))
    : [];

  const candidates = isDirectNonYouTube
    ? [source, ...youtubeCandidates]
    : [...youtubeCandidates, source];

  return [...new Set(candidates.filter(Boolean))];
};


export const getPreferredArtwork = (song, size = 'card') => getArtworkCandidates(song, size)[0] || '';
