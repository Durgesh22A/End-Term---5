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

test('authentication registration, duplicate protection, login, and session restoration', async () => {
  const email = `regression_${Date.now()}@example.com`;
  const credentials = { email, password: 'RegressionPass123!' };
  const registration = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Regression User', ...credentials }),
  });

  assert.equal(registration.response.status, 201);
  assert.equal(registration.body.token, undefined);
  const cookie = getCookie(registration.response);
  assert.ok(cookie);

  const duplicate = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Regression User', ...credentials }),
  });
  assert.equal(duplicate.response.status, 400);
  assert.equal(duplicate.body.message, 'Email already registered');

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.toUpperCase(), password: credentials.password }),
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.body.token, undefined);
  assert.ok(getCookie(login.response));

  const session = await request('/api/auth/me', {
    headers: { Cookie: getCookie(login.response) || cookie },
  });
  assert.equal(session.response.status, 200);
  assert.equal(session.body.user.email, email);

  const invalidLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'wrong-password' }),
  });
  assert.equal(invalidLogin.response.status, 401);
  assert.equal(invalidLogin.body.message, 'Invalid email or password');
});
