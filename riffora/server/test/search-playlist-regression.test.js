const test = require('node:test');
const assert = require('node:assert/strict');

const baseUrl = process.env.RIFFORA_TEST_URL || process.env.VIBETUBE_TEST_URL || 'http://localhost:5000';

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
};

const getCookie = (response) => response.headers.get('set-cookie')?.split(';')[0] || '';

test('rate-limited YouTube search never returns unrelated demo songs', async () => {
  const result = await request('/api/music/search?q=barsaat&limit=10');
  if (result.response.status === 429) {
    assert.equal(result.body.success, false);
    assert.match(result.body.message, /rate-limiting|quota/i);
    assert.equal(result.body.results, undefined);
  } else {
    assert.equal(result.response.status, 200);
    for (const song of result.body.results || []) {
      assert.notEqual(song.title, 'Shape of You');
    }
  }
});

test('playlist duplicate prevention remains enforced', async () => {
  const email = `playlist_regression_${Date.now()}@example.com`;
  const registration = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Playlist Regression', email, password: 'RegressionPass123!' }),
  });
  assert.equal(registration.response.status, 201);
  const cookie = getCookie(registration.response);
  assert.ok(cookie);

  const playlist = await request('/api/playlists', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: JSON.stringify({ name: 'Duplicate Regression' }),
  });
  assert.equal(playlist.response.status, 201);
  const id = playlist.body.playlist._id;

  const song = { videoId: 'regression-song', title: 'Regression Song', artist: 'Test Artist' };
  const first = await request(`/api/playlists/${id}/songs`, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: JSON.stringify(song),
  });
  assert.equal(first.response.status, 201);

  const duplicate = await request(`/api/playlists/${id}/songs`, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: JSON.stringify(song),
  });
  assert.equal(duplicate.response.status, 409);
});

test('downloadable catalog preserves direct-audio source metadata', async () => {
  const result = await request('/api/music/downloadable/search?q=Guided%20Motion&limit=5');
  assert.equal(result.response.status, 200);
  const track = (result.body.results || [])[0];
  assert.ok(track);
  assert.equal(track.sourceType, 'direct-audio');
  assert.match(track.audioUrl, /^https?:\/\//);
  assert.match(track.downloadUrl, /^https?:\/\//);
});
