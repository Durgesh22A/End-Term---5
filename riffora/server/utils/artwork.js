const YOUTUBE_VARIANTS = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'];

const isYouTubeId = (id) => (
  typeof id === 'string' &&
  /^[A-Za-z0-9_-]{11}$/.test(id) &&
  !id.startsWith('jamendo-') &&
  !id.startsWith('ftu-') &&
  !id.startsWith('local-')
);

const getYouTubeId = (videoId, thumbnail = '') => {
  if (isYouTubeId(videoId)) return videoId;
  const match = String(thumbnail).match(/\/vi\/([A-Za-z0-9_-]{11})\//);
  return match?.[1] || '';
};

const getArtworkUrl = (videoId, thumbnail = '') => {
  if (thumbnail && !thumbnail.includes('ytimg.com') && !thumbnail.includes('youtube.com')) {
    return thumbnail;
  }
  const id = getYouTubeId(videoId, thumbnail);
  return id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : thumbnail || '';
};


const quality = (value = '') => {
  const index = YOUTUBE_VARIANTS.findIndex(variant => String(value).includes(`${variant}.jpg`));
  return index === -1 ? 2 : index;
};

const preferArtwork = (existing, incoming, videoId) => {
  const current = existing || '';
  const next = incoming || '';
  if (!current) return getArtworkUrl(videoId, next);
  if (!next) return current;
  return quality(next) < quality(current) ? next : current;
};

module.exports = { getArtworkUrl, preferArtwork };
