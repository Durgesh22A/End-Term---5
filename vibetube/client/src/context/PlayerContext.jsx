import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { historyAPI, youtubeAPI } from '../api';
import { useAuth } from './AuthContext';
import { getDownload } from '../utils/downloadStore';
import { parseDurationToSeconds } from '../utils/formatters';
import { isDirectAudioSong } from '../utils/playbackSource.mjs';
import { SESSION_RESTORE_TTL_MS, shouldAutoResume } from '../utils/playbackSession.mjs';

const STORAGE_KEY = 'vibetube-playback';
const SESSION_RESTORE_KEY = 'vibetube-playback-reload';
const PlayerContext = createContext(null);

const readPlayback = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return stored && typeof stored === 'object' ? stored : {};
  } catch {
    return {};
  }
};

const readReloadMarker = () => {
  try {
    const marker = JSON.parse(sessionStorage.getItem(SESSION_RESTORE_KEY) || 'null');
    return marker && typeof marker === 'object' ? marker : null;
  } catch {
    return null;
  }
};

const navigationType = () => {
  try {
    const entry = performance.getEntriesByType?.('navigation')?.[0];
    if (entry?.type) return entry.type;
    return performance.navigation?.type === 1 ? 'reload' : 'navigate';
  } catch {
    return 'navigate';
  }
};

const clampPosition = (position) => (
  Number.isFinite(position) && position >= 0 ? position : 0
);

export const PlayerProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const savedPlaybackRef = useRef(null);
  if (!savedPlaybackRef.current) savedPlaybackRef.current = readPlayback();
  const savedPlayback = savedPlaybackRef.current;
  const initialRestoreRef = useRef(null);
  if (!initialRestoreRef.current) {
    initialRestoreRef.current = {
      shouldAutoResume: shouldAutoResume({
        savedPlayback,
        marker: readReloadMarker(),
        navigationType: navigationType(),
      }),
    };
  }
  const shouldResumeAfterReload = initialRestoreRef.current.shouldAutoResume;

  const playerRef = useRef(null);
  const loadedSongIdRef = useRef('');
  const pendingPlayRef = useRef(false);
  const offlineAudioRef = useRef(new Audio());
  const offlineUrlRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const playNextRef = useRef(null);
  const restoredOfflineRef = useRef(false);
  const relatedLoadingRef = useRef(false);
  const restorePendingRef = useRef(Boolean(savedPlayback.currentSong?.videoId));
  const restorePositionRef = useRef(clampPosition(savedPlayback.currentTime));
  const restorePlayIntentRef = useRef(shouldResumeAfterReload);
  // This is deliberately separate from `isPlaying`: YouTube reports buffering as a
  // non-playing state even though the user still expects playback to resume.
  const playIntentRef = useRef(shouldResumeAfterReload);
  const restoreAttemptTimerRef = useRef(null);
  const stateRef = useRef({});
  const pendingHistorySongRef = useRef(null);
  const lastLoggedSongRef = useRef({ videoId: null, at: 0 });

  const [isReady, setIsReady] = useState(false);
  const [currentSong, setCurrentSong] = useState(savedPlayback.currentSong || null);
  const [queue, setQueue] = useState(Array.isArray(savedPlayback.queue) ? savedPlayback.queue : []);
  const [queueIndex, setQueueIndex] = useState(Number.isInteger(savedPlayback.queueIndex) ? savedPlayback.queueIndex : 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(() => parseDurationToSeconds(savedPlayback.currentSong?.duration) || 0);
  const [currentTime, setCurrentTime] = useState(clampPosition(savedPlayback.currentTime));
  const [volume, setVolume] = useState(Number.isFinite(savedPlayback.volume) ? savedPlayback.volume : 70);
  const [isMuted, setIsMuted] = useState(Boolean(savedPlayback.isMuted));
  const [showQueue, setShowQueue] = useState(false);
  const [isLooping, setIsLooping] = useState(Boolean(savedPlayback.isLooping));
  const [isShuffled, setIsShuffled] = useState(Boolean(savedPlayback.isShuffled));
  const [isAutoplay, setIsAutoplay] = useState(() => localStorage.getItem('vibetube-autoplay') !== 'false');
  const [showDetails, setShowDetails] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState('This device');
  const [playerError, setPlayerError] = useState('');
  const [failedSongId, setFailedSongId] = useState('');
  const [needsPlaybackResume, setNeedsPlaybackResume] = useState(false);

  const stopOfflineAudio = useCallback(() => {
    const audio = offlineAudioRef.current;
    audio.pause();
    audio.onloadedmetadata = null;
    audio.ontimeupdate = null;
    audio.onplay = null;
    audio.onpause = null;
    audio.onended = null;
    audio.onerror = null;
    audio.removeAttribute('src');
    audio.load();
    if (offlineUrlRef.current) URL.revokeObjectURL(offlineUrlRef.current);
    offlineUrlRef.current = null;
  }, []);

  const persistPlayback = useCallback(() => {
    const state = stateRef.current;
    let position = state.currentTime || 0;
    const restoreInProgress = restorePendingRef.current || restorePlayIntentRef.current;
    if (state.currentSong?.isOffline || isDirectAudioSong(state.currentSong)) {
      position = offlineAudioRef.current.currentTime || position;
    } else if (playerRef.current?.getCurrentTime) {
      position = playerRef.current.getCurrentTime() || position;
    }
    if (restoreInProgress && position === 0) position = restorePositionRef.current;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentSong: state.currentSong,
        queue: state.queue,
        queueIndex: state.queueIndex,
        currentTime: position,
        isPlaying: playIntentRef.current,
        volume: state.volume,
        isMuted: state.isMuted,
        isLooping: state.isLooping,
        isShuffled: state.isShuffled,
      }));
    } catch {
      // Storage can be unavailable or full; playback itself should continue.
    }
  }, []);

  const startProgressTracking = useCallback(() => {
    clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime() || 0);
        const ytDuration = playerRef.current.getDuration?.();
        if (ytDuration && ytDuration > 0) {
          setDuration(ytDuration);
        }
      }
      persistPlayback();
    }, 1000);
  }, [persistPlayback]);

  const stopProgressTracking = useCallback(() => {
    clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = null;
    persistPlayback();
  }, [persistPlayback]);

  const recordCurrentPlay = useCallback(() => {
    const song = pendingHistorySongRef.current || stateRef.current.currentSong;
    if (!stateRef.current.isAuthenticated || !song?.videoId || restorePlayIntentRef.current) return;

    const now = Date.now();
    const shouldLog = lastLoggedSongRef.current.videoId !== song.videoId
      || now - lastLoggedSongRef.current.at > 10000;
    if (!shouldLog) return;

    lastLoggedSongRef.current = { videoId: song.videoId, at: now };
    pendingHistorySongRef.current = null;
    historyAPI.log({
      videoId: song.videoId,
      title: song.title,
      thumbnail: song.thumbnail,
      artist: song.artist,
      duration: song.duration,
    }).catch(() => {
      // History failures must never interrupt active playback.
    });
  }, []);

  const persistSameTabReloadMarker = useCallback(() => {
    const state = stateRef.current;
    try {
      if (state.currentSong?.videoId && playIntentRef.current) {
        sessionStorage.setItem(SESSION_RESTORE_KEY, JSON.stringify({
          version: 1,
          wasPlaying: true,
          songId: state.currentSong.videoId,
          expiresAt: Date.now() + SESSION_RESTORE_TTL_MS,
        }));
      } else {
        sessionStorage.removeItem(SESSION_RESTORE_KEY);
      }
    } catch {
      // sessionStorage can be unavailable; playback still stays paused safely.
    }
  }, []);

  const onPlayerReady = useCallback((player) => {
    playerRef.current = player;
    player.setVolume(stateRef.current.volume);
    if (stateRef.current.isMuted) player.mute();
    setIsReady(true);

    const song = stateRef.current.currentSong;
    if (!song?.videoId || song.isOffline) return;

    const isRestoring = restorePendingRef.current;
    restorePendingRef.current = false;
    loadedSongIdRef.current = song.videoId;

    const initialDuration = parseDurationToSeconds(song.duration);
    if (initialDuration > 0) setDuration(initialDuration);

    if (isRestoring) {
      const targetPos = restorePositionRef.current;
      setCurrentTime(targetPos);
      if (restorePlayIntentRef.current) {
        try {
          // `cueVideoById()` and an immediate `playVideo()` race each other in
          // the IFrame API. Load directly only for the trusted same-tab reload
          // case so the saved track and timestamp are restored together.
          player.loadVideoById(song.videoId, targetPos);
          clearTimeout(restoreAttemptTimerRef.current);
          // IFrame API playback does not return a Promise, so blocked autoplay is
          // signalled by never reaching PLAYING rather than a caught exception.
          restoreAttemptTimerRef.current = window.setTimeout(() => {
            if (restorePlayIntentRef.current) {
              restorePlayIntentRef.current = false;
              playIntentRef.current = false;
              setIsPlaying(false);
              setNeedsPlaybackResume(true);
            }
          }, 2000);
        } catch {
          restorePlayIntentRef.current = false;
          playIntentRef.current = false;
          setIsPlaying(false);
          setNeedsPlaybackResume(true);
        }
      } else if (typeof player.cueVideoById === 'function') {
        // A normal page load or a different tab restores the selected song and
        // position but never starts audio without a deliberate user action.
        player.cueVideoById(song.videoId, targetPos);
      } else {
        player.loadVideoById(song.videoId, targetPos);
        player.pauseVideo();
      }
    } else {
      player.loadVideoById(song.videoId);
      if (pendingPlayRef.current) {
        pendingPlayRef.current = false;
        player.playVideo();
      }
    }
  }, []);

  const onPlayerStateChange = useCallback((state) => {
    if (state === 1) { // Playing
      const wasRestoring = restorePlayIntentRef.current;
      setIsPlaying(true);
      restorePlayIntentRef.current = false;
      playIntentRef.current = true;
      clearTimeout(restoreAttemptTimerRef.current);
      setNeedsPlaybackResume(false);
      if (!wasRestoring) recordCurrentPlay();
      const ytDuration = playerRef.current?.getDuration?.();
      if (ytDuration && ytDuration > 0) setDuration(ytDuration);
      startProgressTracking();
    } else if (state === 2 || state === 3) { // Paused or Buffering
      setIsPlaying(false);
      if (state === 2) playIntentRef.current = false;
      const ytDuration = playerRef.current?.getDuration?.();
      if (ytDuration && ytDuration > 0) setDuration(ytDuration);
      stopProgressTracking();
    } else if (state === 5) { // Cued
      setIsPlaying(false);
      const ytDuration = playerRef.current?.getDuration?.();
      if (ytDuration && ytDuration > 0) setDuration(ytDuration);
      stopProgressTracking();
    } else if (state === 0 && stateRef.current.isAutoplay) { // Ended
      setIsPlaying(false);
      playIntentRef.current = false;
      stopProgressTracking();
      playNextRef.current?.();
    } else if (state === 0) { // Ended with autoplay disabled
      setIsPlaying(false);
      playIntentRef.current = false;
      stopProgressTracking();
    }
  }, [recordCurrentPlay, startProgressTracking, stopProgressTracking]);

  const onPlayerError = useCallback((code) => {
    const messages = {
      2: 'This track could not be loaded.',
      5: 'This track is not available in the embedded player.',
      100: 'This video is unavailable or private.',
      101: 'Embedding restricted by owner. Click next track.',
      150: 'Embedding restricted by owner. Click next track.',
    };
    const activeSong = stateRef.current.currentSong;
    setPlayerError(messages[code] || 'The player could not load this track.');
    setFailedSongId(activeSong?.videoId || '');
    setIsPlaying(false);
    playIntentRef.current = false;
    setNeedsPlaybackResume(false);
    const fallbackDuration = parseDurationToSeconds(activeSong?.duration);
    if (fallbackDuration > 0) {
      setDuration(fallbackDuration);
    }
    stopProgressTracking();

    if (stateRef.current.isAutoplay && playNextRef.current) {
      setTimeout(() => {
        if (stateRef.current.currentSong?.videoId === activeSong?.videoId) {
          playNextRef.current();
        }
      }, 3500);
    }
  }, [stopProgressTracking]);

  const playSong = useCallback((song, newQueue = null) => {
    if (!song) return;
    restorePendingRef.current = false;
    restorePlayIntentRef.current = false;
    playIntentRef.current = true;
    pendingHistorySongRef.current = song;
    setNeedsPlaybackResume(false);
    setPlayerError('');
    setFailedSongId('');

    // Prevent duplicate reload and interruption if clicking currently active track
    if (
      playerRef.current &&
      loadedSongIdRef.current === song.videoId &&
      !song.isOffline &&
      !currentSong?.isOffline &&
      !isDirectAudioSong(song)
    ) {
      const state = playerRef.current.getPlayerState?.();
      if (state === 1) return; // Already playing
      if (state === 2 || state === 5) {
        playerRef.current.playVideo();
        return;
      }
    }

    if (newQueue) {
      setQueue(newQueue);
      const idx = newQueue.findIndex(item => item.videoId === song.videoId);
      setQueueIndex(idx >= 0 ? idx : 0);
    } else {
      setQueue(prev => prev.find(item => item.videoId === song.videoId) ? prev : [...prev, song]);
    }

    const fallbackDuration = parseDurationToSeconds(song.duration);
    if (fallbackDuration > 0) {
      setDuration(fallbackDuration);
    }

    const startPlayback = async () => {
      let offlineRecord = null;
      if (song.isOffline) offlineRecord = await getDownload(song.videoId);
      const directAudioUrl = song.audioUrl || song.downloadUrl;
      const useNativeAudio = Boolean(offlineRecord?.audioBlob || isDirectAudioSong(song));

      if (useNativeAudio) {
        if (song.isOffline && !offlineRecord?.audioBlob) {
          setCurrentSong(song);
          setPlayerError('This offline track is no longer available in local storage.');
          setFailedSongId(song.videoId);
          setIsPlaying(false);
          return;
        }
        if (!song.isOffline && !directAudioUrl) {
          setCurrentSong(song);
          setPlayerError('This direct-audio track has no playable audio URL.');
          setFailedSongId(song.videoId);
          setIsPlaying(false);
          return;
        }
        stopOfflineAudio();
        const audio = offlineAudioRef.current;
        offlineUrlRef.current = offlineRecord?.audioBlob
          ? URL.createObjectURL(offlineRecord.audioBlob)
          : directAudioUrl;
        audio.src = offlineUrlRef.current;
        audio.volume = stateRef.current.volume / 100;
        audio.muted = stateRef.current.isMuted;
        audio.onloadedmetadata = () => setDuration(audio.duration || fallbackDuration || 0);
        audio.ontimeupdate = () => setCurrentTime(audio.currentTime || 0);
        audio.onplay = () => {
          setIsPlaying(true);
          recordCurrentPlay();
        };
        audio.onpause = () => {
          setIsPlaying(false);
          playIntentRef.current = false;
        };
        audio.onended = () => {
          setIsPlaying(false);
          playIntentRef.current = false;
          if (stateRef.current.isAutoplay) playNextRef.current?.();
        };
        audio.onerror = () => {
          setIsPlaying(false);
          setPlayerError('This direct audio source is unavailable or blocked by the provider.');
          setFailedSongId(song.videoId);
          stopProgressTracking();
        };
        playerRef.current?.pauseVideo?.();
        setCurrentSong(offlineRecord?.audioBlob ? { ...song, isOffline: true } : song);
        setCurrentTime(0);
        try {
          await audio.play();
        } catch (error) {
          setIsPlaying(false);
          setNeedsPlaybackResume(true);
          setPlayerError(error?.message || 'The audio could not be played.');
          setFailedSongId(song.videoId);
        }
        return;
      }

      stopOfflineAudio();
      playerRef.current?.pauseVideo?.();
      pendingPlayRef.current = true;
      setCurrentSong(song);
      setCurrentTime(0);
      if (playerRef.current && stateRef.current.isReady) {
        loadedSongIdRef.current = song.videoId;
        playerRef.current.loadVideoById(song.videoId);
        pendingPlayRef.current = false;
        playerRef.current.playVideo();
      }
    };
    startPlayback().catch(() => {
      setCurrentSong(song);
      setCurrentTime(0);
    });

  }, [currentSong?.isOffline, stopOfflineAudio, stopProgressTracking, recordCurrentPlay]);

  const togglePlay = useCallback(() => {
    if (currentSong?.isOffline || isDirectAudioSong(currentSong)) {
      if (isPlaying) {
        playIntentRef.current = false;
        offlineAudioRef.current.pause();
      } else {
        playIntentRef.current = true;
        offlineAudioRef.current.play().then(() => setNeedsPlaybackResume(false)).catch((error) => {
          setIsPlaying(false);
          setNeedsPlaybackResume(true);
          setPlayerError(error?.message || 'The audio could not be played.');
          setFailedSongId(currentSong.videoId);
        });
      }
      return;
    }
    if (!playerRef.current || failedSongId === currentSong?.videoId) return;
    const playerState = playerRef.current.getPlayerState?.();
    if (playerState === 1) {
      playIntentRef.current = false;
      playerRef.current.pauseVideo();
    } else {
      playIntentRef.current = true;
      setNeedsPlaybackResume(false);
      playerRef.current.playVideo();
    }
  }, [currentSong, failedSongId, isPlaying]);

  const resumePlayback = useCallback(() => {
    if (!currentSong || failedSongId === currentSong.videoId) return;
    clearTimeout(restoreAttemptTimerRef.current);
    restorePlayIntentRef.current = false;
    playIntentRef.current = true;
    if (currentSong.isOffline || isDirectAudioSong(currentSong)) {
      offlineAudioRef.current.play()
        .then(() => setNeedsPlaybackResume(false))
        .catch(() => {
          setNeedsPlaybackResume(true);
        });
      return;
    }
    playerRef.current?.playVideo?.();
    window.setTimeout(() => {
      if (playIntentRef.current && !stateRef.current.isPlaying) setNeedsPlaybackResume(true);
    }, 1000);
  }, [currentSong, failedSongId]);


  const playNext = useCallback(() => {
    const current = stateRef.current.currentSong;
    if (!current || relatedLoadingRef.current) return;

    const hasNextInQueue = queue.length > 1 && queueIndex < queue.length - 1;
    if (hasNextInQueue || isLooping || isShuffled) {
      const nextIndex = isLooping
        ? queueIndex
        : isShuffled
          ? Math.floor(Math.random() * queue.length)
          : queueIndex + 1;
      setQueueIndex(nextIndex);
      playSong(queue[nextIndex]);
      return;
    }

    relatedLoadingRef.current = true;
    const query = [current.artist, current.title].filter(Boolean).join(' ').trim();
    if (!query) {
      relatedLoadingRef.current = false;
      return;
    }

    youtubeAPI.search(query, 10)
      .then(({ data }) => {
        const queuedIds = new Set(queue.map(song => song.videoId));
        const relatedSong = (data.results || []).find(song => (
          song.videoId && !queuedIds.has(song.videoId) && song.videoId !== current.videoId
        ));
        if (!relatedSong) return;
        const nextQueue = [...queue, relatedSong];
        setQueue(nextQueue);
        setQueueIndex(nextQueue.length - 1);
        playSong(relatedSong, nextQueue);
      })
      .catch(() => {})
      .finally(() => {
        relatedLoadingRef.current = false;
      });
  }, [queue, queueIndex, isLooping, isShuffled, playSong]);
  playNextRef.current = playNext;

  const playPrev = useCallback(() => {
    if (!queue.length) return;
    if (currentTime > 3) {
      if (currentSong?.isOffline || isDirectAudioSong(currentSong)) {
        offlineAudioRef.current.currentTime = 0;
      } else if (playerRef.current) {
        playerRef.current.seekTo(0);
      }
      setCurrentTime(0);
      return;
    }
    const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    setQueueIndex(prevIndex);
    playSong(queue[prevIndex]);
  }, [queue, queueIndex, currentTime, currentSong, playSong]);

  const seekTo = useCallback((seconds) => {
    if (currentSong?.isOffline || isDirectAudioSong(currentSong)) {
      offlineAudioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      persistPlayback();
      return;
    }
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
      persistPlayback();
    }
  }, [currentSong, persistPlayback]);

  const setVolumeLevel = useCallback((level) => {
    setVolume(level);
    offlineAudioRef.current.volume = level / 100;
    if (playerRef.current) playerRef.current.setVolume(level);
    setIsMuted(level === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (currentSong?.isOffline || isDirectAudioSong(currentSong)) {
      offlineAudioRef.current.muted = !isMuted;
      setIsMuted(prev => !prev);
      return;
    }
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  }, [currentSong, isMuted, volume]);

  const addToQueue = useCallback((song) => {
    setQueue(prev => prev.find(item => item.videoId === song.videoId) ? prev : [...prev, song]);
  }, []);
  const removeFromQueue = useCallback((videoId) => setQueue(prev => prev.filter(song => song.videoId !== videoId)), []);
  const playFromQueue = useCallback((index) => {
    setQueueIndex(index);
    playSong(queue[index]);
  }, [queue, playSong]);

  const toggleAutoplay = useCallback(() => {
    setIsAutoplay(prev => {
      const next = !prev;
      localStorage.setItem('vibetube-autoplay', String(next));
      return next;
    });
  }, []);

  const chooseAudioDevice = useCallback(async () => {
    if (!navigator.mediaDevices?.selectAudioOutput) {
      const message = 'Audio output selection is not supported by this browser. Use your system Bluetooth or sound settings.';
      setDeviceStatus(message);
      return message;
    }
    try {
      const device = await navigator.mediaDevices.selectAudioOutput();
      const message = device.label
        ? `${device.label} selected, but YouTube iframe audio remains controlled by the browser.`
        : 'Device selected, but YouTube iframe audio remains controlled by the browser.';
      setDeviceStatus(message);
      return message;
    } catch {
      const message = 'No audio device was selected.';
      setDeviceStatus(message);
      return message;
    }
  }, []);

  stateRef.current = {
    currentSong, queue, queueIndex, currentTime, isPlaying, volume, isMuted,
    isLooping, isShuffled, isAutoplay, isReady, isAuthenticated,
  };

  // Persist track/settings changes immediately after React has committed them;
  // time position remains throttled by the progress and five-second timers.
  useEffect(() => {
    persistPlayback();
  }, [currentSong, queue, queueIndex, isPlaying, volume, isMuted, isLooping, isShuffled, persistPlayback]);

  useEffect(() => {
    const timer = setInterval(persistPlayback, 5000);
    const saveBeforeLeaving = () => {
      persistPlayback();
      persistSameTabReloadMarker();
    };
    window.addEventListener('beforeunload', saveBeforeLeaving);
    window.addEventListener('pagehide', saveBeforeLeaving);
    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', saveBeforeLeaving);
      window.removeEventListener('pagehide', saveBeforeLeaving);
      clearTimeout(restoreAttemptTimerRef.current);
      saveBeforeLeaving();
      clearInterval(progressIntervalRef.current);
      stopOfflineAudio();
    };
  }, [persistPlayback, persistSameTabReloadMarker, stopOfflineAudio]);

  useEffect(() => {
    if (isDirectAudioSong(savedPlayback.currentSong) && !restoredOfflineRef.current) {
      restoredOfflineRef.current = true;
      const audio = offlineAudioRef.current;
      const source = savedPlayback.currentSong.audioUrl || savedPlayback.currentSong.downloadUrl;
      audio.src = source;
      audio.volume = (Number.isFinite(savedPlayback.volume) ? savedPlayback.volume : 70) / 100;
      audio.muted = Boolean(savedPlayback.isMuted);
      audio.onloadedmetadata = () => {
        setDuration(audio.duration || parseDurationToSeconds(savedPlayback.currentSong.duration) || 0);
        audio.currentTime = clampPosition(savedPlayback.currentTime);
        if (restorePlayIntentRef.current) audio.play().catch(() => {
          restorePlayIntentRef.current = false;
          playIntentRef.current = false;
          setIsPlaying(false);
          setNeedsPlaybackResume(true);
        });
      };
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime || 0);
      audio.onplay = () => {
        const wasRestoring = restorePlayIntentRef.current;
        restorePlayIntentRef.current = false;
        playIntentRef.current = true;
        setIsPlaying(true);
        setNeedsPlaybackResume(false);
        if (!wasRestoring) recordCurrentPlay();
      };
      audio.onpause = () => {
        playIntentRef.current = false;
        setIsPlaying(false);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setPlayerError('The saved direct-audio source is unavailable.');
        setFailedSongId(savedPlayback.currentSong.videoId);
      };
      return () => stopOfflineAudio();
    }
    if (savedPlayback.currentSong?.isOffline && !restoredOfflineRef.current) {
      restoredOfflineRef.current = true;
      getDownload(savedPlayback.currentSong.videoId)
        .then(record => {
          if (!record?.audioBlob) return;
          const audio = offlineAudioRef.current;
          const url = URL.createObjectURL(record.audioBlob);
          offlineUrlRef.current = url;
          audio.src = url;
          audio.volume = volume / 100;
          audio.muted = isMuted;
          audio.onloadedmetadata = () => {
            setDuration(audio.duration || 0);
            audio.currentTime = clampPosition(savedPlayback.currentTime);
            if (restorePlayIntentRef.current) audio.play().catch(() => {
              restorePlayIntentRef.current = false;
              playIntentRef.current = false;
              setIsPlaying(false);
              setNeedsPlaybackResume(true);
            });
          };
          audio.ontimeupdate = () => setCurrentTime(audio.currentTime || 0);
          audio.onplay = () => {
            const wasRestoring = restorePlayIntentRef.current;
            restorePlayIntentRef.current = false;
            playIntentRef.current = true;
            setIsPlaying(true);
            setNeedsPlaybackResume(false);
            if (!wasRestoring) recordCurrentPlay();
          };
          audio.onpause = () => {
            playIntentRef.current = false;
            setIsPlaying(false);
          };
          audio.onerror = () => {
            setIsPlaying(false);
            setPlayerError('The saved offline audio is unavailable.');
            setFailedSongId(savedPlayback.currentSong.videoId);
          };
        })
        .catch(() => {});
    }
  }, [recordCurrentPlay, savedPlayback, stopOfflineAudio]);

  const value = {
    playerRef, onPlayerReady, onPlayerStateChange, onPlayerError,
    currentSong, queue, queueIndex, isPlaying, duration, currentTime,
    volume, isMuted, showQueue, isLooping, isShuffled, isAutoplay,
    showDetails, deviceStatus, playerError, needsPlaybackResume,
    failedSongId,
    playSong, togglePlay, playNext, playPrev, seekTo, setVolumeLevel, toggleMute,
    addToQueue, removeFromQueue, playFromQueue,
    setShowQueue, setIsLooping, setIsShuffled,
    toggleAutoplay, setShowDetails, chooseAudioDevice, resumePlayback,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
};
