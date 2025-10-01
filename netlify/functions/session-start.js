const { ObjectId } = require('mongodb');
const { getDb } = require('./lib/db');
const { requireAuthentication } = require('./lib/auth');
const { jsonResponse, optionsResponse } = require('./lib/response');

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse('POST,OPTIONS');
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { message: 'Method Not Allowed' });
  }

  const authResult = requireAuthentication(event);
  if (!authResult.isAuthorized) {
    return authResult.response;
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return jsonResponse(400, { message: 'Invalid JSON payload' });
  }

  const identityIds = Array.isArray(payload.identityIds)
    ? [...new Set(payload.identityIds)]
    : [];
  if (identityIds.length === 0) {
    return jsonResponse(400, { message: 'At least one identity is required to start a session' });
  }

  try {
    const db = await getDb();
    const collection = db.collection('sessions');

    const now = new Date();
    const identities = identityIds.map((id) => {
      try {
        return new ObjectId(id);
      } catch (error) {
        throw new Error(`Invalid identity id: ${id}`);
      }
    });

    const result = await collection.insertOne({
      session_start_dt: now,
      session_end_dt: null,
      identities,
    });

    return jsonResponse(201, { sessionId: result.insertedId.toString() });
  } catch (error) {
    console.error('Failed to start session', error);
    if (error.message && error.message.startsWith('Invalid identity id')) {
      return jsonResponse(400, { message: error.message });
    }
    return jsonResponse(500, { message: 'Internal Server Error' });
  }
};
