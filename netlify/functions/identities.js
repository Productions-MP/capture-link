const { getDb } = require('./lib/db');
const { requireAuthentication } = require('./lib/auth');
const { jsonResponse, optionsResponse } = require('./lib/response');

function normalizeIdentityDocument(document) {
  return {
    id: document._id.toString(),
    firstName: document.first_name ?? null,
    lastName: document.last_name ?? null,
    commonName: document.common_name ?? null,
    campus: document.campus ?? null,
    grade: document.grade ?? null,
    section: document.section ?? null,
    house: document.house ?? null,
    contactIds: Array.isArray(document.contact_ids) ? document.contact_ids : [],
  };
}

function buildIdentityDocument(payload) {
  const now = new Date();
  const cleanContactIds = Array.isArray(payload.contactIds)
    ? [...new Set(payload.contactIds.filter((value) => value !== null && value !== ''))]
    : [];

  const document = {
    first_name: payload.firstName,
    last_name: payload.lastName,
    common_name: payload.commonName ?? null,
    campus: payload.campus ?? null,
    grade: payload.grade ?? null,
    section: payload.section ?? null,
    house: payload.house ?? null,
    contact_ids: cleanContactIds,
    campus_history: payload.campus
      ? [
          {
            campus: payload.campus,
            changed_at: now,
          },
        ]
      : [],
    grade_history:
      payload.grade !== undefined && payload.grade !== null
        ? [
            {
              grade: payload.grade,
              section: payload.section ?? null,
              changed_at: now,
            },
          ]
        : [],
    house_history: payload.house
      ? [
          {
            house: payload.house,
            changed_at: now,
          },
        ]
      : [],
    last_updated: now,
    status: 'active',
  };

  return document;
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse('GET,POST,OPTIONS');
  }

  const authResult = requireAuthentication(event);
  if (!authResult.isAuthorized) {
    return authResult.response;
  }

  try {
    const db = await getDb();
    const collection = db.collection('identities');

    if (event.httpMethod === 'GET') {
      const documents = await collection
        .find({ status: 'active' })
        .sort({ last_name: 1, first_name: 1 })
        .toArray();

      return jsonResponse(200, { identities: documents.map(normalizeIdentityDocument) });
    }

    if (event.httpMethod === 'POST') {
      let payload;
      try {
        payload = JSON.parse(event.body || '{}');
      } catch (error) {
        return jsonResponse(400, { message: 'Invalid JSON payload' });
      }

      if (!payload.firstName || !payload.lastName) {
        return jsonResponse(400, { message: 'First name and last name are required' });
      }

      const document = buildIdentityDocument(payload);
      const result = await collection.insertOne(document);

      return jsonResponse(201, { id: result.insertedId.toString() });
    }

    return jsonResponse(405, { message: 'Method Not Allowed' });
  } catch (error) {
    console.error('Failed to handle identities request', error);
    return jsonResponse(500, { message: 'Internal Server Error' });
  }
};
