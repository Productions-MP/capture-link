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

  if (!payload.sessionId) {
    return jsonResponse(400, { message: 'sessionId is required' });
  }

  let sessionObjectId;
  try {
    sessionObjectId = new ObjectId(payload.sessionId);
  } catch (error) {
    return jsonResponse(400, { message: 'Invalid sessionId' });
  }

  try {
    const db = await getDb();
    const collection = db.collection('sessions');
    const result = await collection.updateOne(
      { _id: sessionObjectId },
      {
        $set: {
          session_end_dt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return jsonResponse(404, { message: 'Session not found' });
    }

    return jsonResponse(200, { success: true });
  } catch (error) {
    console.error('Failed to end session', error);
    return jsonResponse(500, { message: 'Internal Server Error' });
  }
};
