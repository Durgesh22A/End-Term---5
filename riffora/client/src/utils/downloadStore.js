const DB_NAME = 'vibetube-offline';
const STORE_NAME = 'downloads';
const DB_VERSION = 1;

const openDatabase = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'videoId' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Unable to open offline storage'));
});

const runTransaction = async (mode, callback) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = callback(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Offline storage request failed'));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error || new Error('Offline storage transaction failed'));
  });
};

export const listDownloads = () => runTransaction('readonly', store => store.getAll());
export const getDownload = (videoId) => runTransaction('readonly', store => store.get(videoId));
export const deleteDownload = (videoId) => runTransaction('readwrite', store => store.delete(videoId));

export const getStorageEstimate = async () => {
  if (!navigator.storage?.estimate) return null;
  return navigator.storage.estimate();
};

const getDirectAudioUrl = (song) => song?.downloadUrl || song?.audioUrl;

const isYouTubeUrl = (value) => {
  try {
    const url = new URL(value);
    return /(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(url.hostname);
  } catch {
    return false;
  }
};

export const getDownloadAvailability = (song) => {
  if (!song) return { allowed: false, reason: 'Song information is unavailable.' };
  if (song.audioFile instanceof Blob || song.audioBlob instanceof Blob) {
    return { allowed: true, reason: '' };
  }
  if (song.sourceType === 'youtube-embed' || (song.videoId && !song.downloadUrl && !song.audioUrl)) {
    return { allowed: false, reason: song.downloadReason || 'YouTube videos provide an embed only; their audio cannot be downloaded here.' };
  }
  if (song.downloadable !== true) {
    return { allowed: false, reason: 'The owner has not marked an audio source as downloadable.' };
  }
  const url = getDirectAudioUrl(song);
  if (typeof url !== 'string' || !url.trim()) {
    return { allowed: false, reason: 'This song has no authorized direct audio URL.' };
  }
  if (isYouTubeUrl(url)) {
    return { allowed: false, reason: 'YouTube video and embed URLs are not downloadable audio files.' };
  }
  try {
    const parsed = new URL(url, window.location.origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { allowed: false, reason: 'The audio source must be an HTTP(S) direct audio URL.' };
    }
  } catch {
    return { allowed: false, reason: 'The authorized audio URL is invalid.' };
  }
  return { allowed: true, reason: '' };
};

export const canDownloadSong = (song) => getDownloadAvailability(song).allowed;

export const downloadSong = async (song, onProgress, signal) => {
  const availability = getDownloadAvailability(song);
  if (!availability.allowed) {
    throw new Error(availability.reason);
  }
  let blob;
  if (song.audioFile instanceof Blob) {
    blob = song.audioFile;
    onProgress?.(1);
  } else if (song.audioBlob instanceof Blob) {
    blob = song.audioBlob;
    onProgress?.(1);
  } else {
    const response = await fetch(getDirectAudioUrl(song), { signal });
    if (!response.ok) throw new Error(`Download failed (HTTP ${response.status})`);

    const contentLength = Number(response.headers.get('content-length')) || 0;
    const reader = response.body?.getReader();
    const chunks = [];
    let received = 0;

    if (reader) {
      while (true) {
        if (signal?.aborted) {
          await reader.cancel();
          throw new DOMException('Download cancelled', 'AbortError');
        }
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        onProgress?.(contentLength ? received / contentLength : null);
      }
    } else {
      chunks.push(new Uint8Array(await response.arrayBuffer()));
      onProgress?.(1);
    }
    blob = new Blob(chunks, { type: response.headers.get('content-type') || 'audio/mpeg' });
  }

  const record = {
    ...song,
    videoId: song.videoId,
    downloadable: true,
    audioFile: undefined,
    audioBlob: blob,
    downloadedAt: new Date().toISOString(),
    size: blob.size,
  };
  await runTransaction('readwrite', store => store.put(record));
  window.dispatchEvent(new CustomEvent('riffora-downloads-changed'));
  return record;
};

export const importAudioFile = async (file, metadata = {}) => {
  if (!(file instanceof Blob) || !file.type.startsWith('audio/')) {
    throw new Error('Choose a local audio file.');
  }
  const videoId = metadata.videoId || `local-${crypto.randomUUID()}`;
  const record = {
    videoId,
    title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
    artist: metadata.artist || 'Local audio',
    thumbnail: metadata.thumbnail || '',
    duration: metadata.duration || '',
    downloadable: true,
    audioBlob: file,
    downloadedAt: new Date().toISOString(),
    size: file.size,
    sourceType: 'user-owned',
  };
  await runTransaction('readwrite', store => store.put(record));
  window.dispatchEvent(new CustomEvent('riffora-downloads-changed'));
  return record;
};
