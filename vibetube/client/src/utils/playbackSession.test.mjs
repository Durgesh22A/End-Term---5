import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldAutoResume } from './playbackSession.mjs';

const savedPlayback = { currentSong: { videoId: 'same-tab-song' }, isPlaying: true };
const marker = { version: 1, wasPlaying: true, songId: 'same-tab-song', expiresAt: 50_000 };

test('permits automatic resume only for a recent same-tab reload', () => {
  assert.equal(shouldAutoResume({ savedPlayback, marker, navigationType: 'reload', now: 10_000 }), true);
});

test('does not autoplay in a new tab even with shared local playback data', () => {
  assert.equal(shouldAutoResume({ savedPlayback, marker, navigationType: 'navigate', now: 10_000 }), false);
});

test('rejects expired, paused, and different-track markers', () => {
  assert.equal(shouldAutoResume({ savedPlayback, marker: { ...marker, expiresAt: 9_999 }, navigationType: 'reload', now: 10_000 }), false);
  assert.equal(shouldAutoResume({ savedPlayback, marker: { ...marker, wasPlaying: false }, navigationType: 'reload', now: 10_000 }), false);
  assert.equal(shouldAutoResume({ savedPlayback, marker: { ...marker, songId: 'other-song' }, navigationType: 'reload', now: 10_000 }), false);
  assert.equal(shouldAutoResume({ savedPlayback: { ...savedPlayback, isPlaying: false }, marker, navigationType: 'reload', now: 10_000 }), false);
});
