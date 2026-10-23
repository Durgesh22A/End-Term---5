export const SESSION_RESTORE_TTL_MS = 60_000;

/**
 * localStorage is shared by all tabs, so its `isPlaying` flag is only a
 * corroborating signal. Autoplay also requires a recent same-tab marker for
 * the same saved track.
 */
export const shouldAutoResume = ({ savedPlayback, marker, navigationType, now = Date.now() }) => Boolean(
  navigationType === 'reload'
  && savedPlayback?.isPlaying === true
  && marker?.version === 1
  && marker.wasPlaying === true
  && typeof marker.songId === 'string'
  && marker.songId === savedPlayback?.currentSong?.videoId
  && Number.isFinite(marker.expiresAt)
  && marker.expiresAt >= now
);
