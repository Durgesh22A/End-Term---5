const test = require('node:test');
const assert = require('node:assert/strict');

const baseUrl = process.env.VIBETUBE_TEST_URL || 'http://localhost:5000';

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
};

const cookieFrom = (response) => response.headers.get('set-cookie')?.split(';')[0] || '';

test('recently played keeps one entry per track and moves a replayed track to the top', async () => {
  const email = `history_regression_${Date.now()}@example.com`;
  const registration = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'History Regression', email, password: 'RegressionPass123!' }),
  });
  assert.equal(registration.response.status, 201);
  const cookie = cookieFrom(registration.response);
  assert.ok(cookie);

  const first = { videoId: 'history-first', title: 'First History Track', artist: 'Test Artist', duration: '3:01' };
  const second = { videoId: 'history-second', title: 'Second History Track', artist: 'Test Artist', duration: '2:45' };
  for (const song of [first, second, first]) {
    const logged = await request('/api/history', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: JSON.stringify(song),
    });
    assert.equal(logged.response.status, 201);
  }

  const history = await request('/api/history?limit=10', { headers: { Cookie: cookie } });
  assert.equal(history.response.status, 200);
  assert.equal(history.body.history.length, 2);
  assert.equal(history.body.history[0].videoId, first.videoId);
  assert.equal(history.body.history[1].videoId, second.videoId);
});
