import test from 'node:test';
import assert from 'node:assert/strict';
import { isDirectAudioSong } from './playbackSource.mjs';

test('selects native audio for authorized direct-audio tracks', () => {
  assert.equal(isDirectAudioSong({
    videoId: 'ftu-guided-motion',
    sourceType: 'direct-audio',
    audioUrl: 'https://example.test/audio.mp3',
  }), true);
});

test('does not route YouTube embeds to native audio', () => {
  assert.equal(isDirectAudioSong({
    videoId: 'youtube-id',
    sourceType: 'youtube-embed',
  }), false);
});

test('does not route offline records to the direct URL engine', () => {
  assert.equal(isDirectAudioSong({
    videoId: 'ftu-guided-motion',
    sourceType: 'direct-audio',
    audioUrl: 'https://example.test/audio.mp3',
    isOffline: true,
  }), false);
});
