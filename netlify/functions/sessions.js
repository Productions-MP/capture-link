const { ObjectId } = require('mongodb');
const { getDb } = require('./lib/db');
const { requireAuthentication } = require('./lib/auth');
const { jsonResponse, optionsResponse } = require('./lib/response');

function parseDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function toDateString(date) {
  return date ? date.toISOString() : null;
}

function getIdString(value) {
  if (!value) {
    return null;
  }

  if (value instanceof ObjectId) {
    return value.toString();
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value.$oid) {
    return value.$oid;
  }

  return null;
}

function toObjectId(value) {
  const stringValue = getIdString(value);
  if (!stringValue || !ObjectId.isValid(stringValue)) {
    return null;
  }
  return new ObjectId(stringValue);
}

function normalizeIdentityDocument(document) {
  return {
    id: document._id.toString(),
    firstName: document.first_name ?? null,
    lastName: document.last_name ?? null,
    campus: document.campus ?? null,
    grade: document.grade ?? null,
    house: document.house ?? null,
    fullName: document.common_name ?? null,
  };
}

function normalizeImageDocument(document) {
  const capturedAt = parseDate(document.exif_date_time_original);
  return {
    id: document._id.toString(),
    directoryPath: document.directory_path ?? null,
    filename: document.filename ?? null,
    exifDateTimeOriginal: toDateString(capturedAt),
    correctionOffsetMs: document.correction_offset_ms ?? null,
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse('GET,PUT,OPTIONS');
  }

  const authResult = requireAuthentication(event);
  if (!authResult.isAuthorized) {
    return authResult.response;
  }

  try {
    const db = await getDb();
    const sessionsCollection = db.collection('sessions');

    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      const startParam = params.start;
      const endParam = params.end;

      if (!startParam || !endParam) {
        return jsonResponse(400, { message: 'start and end query parameters are required' });
      }

      const startDate = parseDate(startParam);
      const endDate = parseDate(endParam);

      if (!startDate || !endDate || endDate <= startDate) {
        return jsonResponse(400, { message: 'Invalid date range provided' });
      }

      const query = {
        $and: [
          {
            $or: [
              { session_start_dt: { $lte: endDate } },
              { session_start: { $lte: endDate.getTime() } },
            ],
          },
          {
            $or: [
              { session_end_dt: { $gte: startDate } },
              { session_end: { $gte: startDate.getTime() } },
              { session_end_dt: { $exists: false } },
              { session_end: { $exists: false } },
            ],
          },
        ],
      };

      const sessionDocuments = await sessionsCollection
        .find(query)
        .sort({ session_start_dt: 1 })
        .toArray();

      const identityIdSet = new Set();
      const imageIdSet = new Set();

      sessionDocuments.forEach((document) => {
        const identityValues = Array.isArray(document.identities) ? document.identities : [];
        identityValues.forEach((value) => {
          const id = getIdString(value);
          if (id) {
            identityIdSet.add(id);
          }
        });

        const imageValues = Array.isArray(document.images) ? document.images : [];
        imageValues.forEach((value) => {
          const id = getIdString(value);
          if (id) {
            imageIdSet.add(id);
          }
        });
      });

      const identityIds = Array.from(identityIdSet).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
      const imageIds = Array.from(imageIdSet).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));

      const identityDocuments = identityIds.length
        ? await db.collection('identities').find({ _id: { $in: identityIds } }).toArray()
        : [];

      const imageDocuments = imageIds.length
        ? await db.collection('images').find({ _id: { $in: imageIds } }).toArray()
        : [];

      const identitiesById = new Map(identityDocuments.map((doc) => [doc._id.toString(), normalizeIdentityDocument(doc)]));
      const imagesById = new Map(imageDocuments.map((doc) => [doc._id.toString(), normalizeImageDocument(doc)]));

      const sessions = sessionDocuments.map((document) => {
        const startDateValue = parseDate(document.session_start_dt) || parseDate(document.session_start);
        const endDateValue = parseDate(document.session_end_dt) || parseDate(document.session_end);

        const identityIdsForSession = Array.isArray(document.identities)
          ? document.identities.map(getIdString).filter(Boolean)
          : [];

        const imageIdsForSession = Array.isArray(document.images)
          ? document.images.map(getIdString).filter(Boolean)
          : [];

        const identities = identityIdsForSession.map((id) => identitiesById.get(id) || { id });
        const images = imageIdsForSession.map((id) => imagesById.get(id) || { id });

        return {
          id: document._id.toString(),
          session_start_dt: toDateString(startDateValue),
          session_end_dt: toDateString(endDateValue),
          identityIds: identityIdsForSession,
          identities,
          images,
        };
      });

      return jsonResponse(200, { sessions });
    }

    if (event.httpMethod === 'PUT') {
      let payload;
      try {
        payload = JSON.parse(event.body || '{}');
      } catch (error) {
        return jsonResponse(400, { message: 'Invalid JSON payload' });
      }

      const { sessionId, session: sessionUpdate = {}, imageUpdates = [] } = payload;
      if (!sessionId || !ObjectId.isValid(sessionId)) {
        return jsonResponse(400, { message: 'A valid sessionId is required' });
      }

      const sessionObjectId = new ObjectId(sessionId);
      const existingSession = await sessionsCollection.findOne({ _id: sessionObjectId });
      if (!existingSession) {
        return jsonResponse(404, { message: 'Session not found' });
      }

      const updateSet = {};

      if (sessionUpdate.session_start_dt) {
        const startDate = parseDate(sessionUpdate.session_start_dt);
        if (!startDate) {
          return jsonResponse(400, { message: 'Invalid session_start_dt value' });
        }
        updateSet.session_start_dt = startDate;
        updateSet.session_start = startDate.getTime();
      }

      if (sessionUpdate.session_end_dt) {
        const endDate = parseDate(sessionUpdate.session_end_dt);
        if (!endDate) {
          return jsonResponse(400, { message: 'Invalid session_end_dt value' });
        }
        updateSet.session_end_dt = endDate;
        updateSet.session_end = endDate.getTime();
      }

      if (Array.isArray(sessionUpdate.identityIds)) {
        const identityObjectIds = sessionUpdate.identityIds
          .map(toObjectId)
          .filter((id) => id instanceof ObjectId);
        updateSet.identities = identityObjectIds;
      }

      if (Array.isArray(sessionUpdate.imageIds)) {
        const imageObjectIds = sessionUpdate.imageIds
          .map(toObjectId)
          .filter((id) => id instanceof ObjectId);
        updateSet.images = imageObjectIds;
      }

      if (Object.keys(updateSet).length > 0) {
        await sessionsCollection.updateOne({ _id: sessionObjectId }, { $set: updateSet });
      }

      if (Array.isArray(imageUpdates) && imageUpdates.length > 0) {
        const imagesCollection = db.collection('images');
        for (const update of imageUpdates) {
          const imageId = toObjectId(update.imageId);
          if (!imageId) {
            continue;
          }
          const exifDate = parseDate(update.exif_date_time_original);
          if (!exifDate) {
            continue;
          }
          await imagesCollection.updateOne(
            { _id: imageId },
            { $set: { exif_date_time_original: exifDate } },
          );
        }
      }

      return jsonResponse(200, { success: true });
    }

    return jsonResponse(405, { message: 'Method Not Allowed' });
  } catch (error) {
    console.error('Failed to handle sessions request', error);
    return jsonResponse(500, { message: 'Internal Server Error' });
  }
};
