export const isDirectAudioSong = (song) => Boolean(
  song &&
  !song.isOffline &&
  (song.sourceType === 'direct-audio' || song.sourceType === 'user-owned' || song.audioUrl || song.downloadUrl),
);
