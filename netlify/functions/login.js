const { issueSessionToken } = require('./lib/auth');
const { jsonResponse, optionsResponse } = require('./lib/response');

function getExpectedCredentials() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required');
  }

  return { username, password };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse('POST,OPTIONS');
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { message: 'Method Not Allowed' });
  }

  let credentials;
  try {
    credentials = JSON.parse(event.body || '{}');
  } catch (error) {
    return jsonResponse(400, { message: 'Invalid JSON payload' });
  }

  const { username, password } = credentials;
  if (!username || !password) {
    return jsonResponse(400, { message: 'Username and password are required' });
  }

  const expected = getExpectedCredentials();

  if (username === expected.username && password === expected.password) {
    const { token, expiresAt } = issueSessionToken(username);
    return jsonResponse(200, { token, expiresAt });
  }

  return jsonResponse(401, { message: 'Invalid credentials' });
};
