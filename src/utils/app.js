import Cookies from "js-cookie";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

const API_BASE_PATH = "/.netlify/functions";
const SESSION_TOKEN_COOKIE = "captureLinkSessionToken";
const SESSION_EXPIRES_COOKIE = "captureLinkSessionExpiresAt";
const IS_SECURE_CONTEXT =
  typeof window !== "undefined" &&
  typeof window.location !== "undefined" &&
  window.location.protocol === "https:";

function parseExpiresAt(value) {
  if (!value) {
    return null;
  }

  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : null;
}

export function getSessionTokenCookie() {
  return Cookies.get(SESSION_TOKEN_COOKIE);
}

export function setSessionCookies(token, expiresAt) {
  if (!token || !expiresAt) {
    throw new Error("Token and expiresAt are required to set session cookies");
  }

  const expiresDate = new Date(expiresAt);

  Cookies.set(SESSION_TOKEN_COOKIE, token, {
    expires: expiresDate,
    sameSite: "Strict",
    secure: IS_SECURE_CONTEXT,
  });

  Cookies.set(SESSION_EXPIRES_COOKIE, String(expiresAt), {
    expires: expiresDate,
    sameSite: "Strict",
    secure: IS_SECURE_CONTEXT,
  });
}

export function clearSessionCookies() {
  Cookies.remove(SESSION_TOKEN_COOKIE);
  Cookies.remove(SESSION_EXPIRES_COOKIE);
}

export function hasActiveSession() {
  const token = getSessionTokenCookie();
  const expiresAt = parseExpiresAt(Cookies.get(SESSION_EXPIRES_COOKIE));

  if (!token || !expiresAt) {
    clearSessionCookies();
    return false;
  }

  if (Date.now() >= expiresAt) {
    clearSessionCookies();
    return false;
  }

  return true;
}

async function requestWithAuthentication(endpoint, options = {}) {
  if (!hasActiveSession()) {
    throw new UnauthorizedError("Session expired");
  }

  const token = getSessionTokenCookie();
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${API_BASE_PATH}/${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearSessionCookies();
    throw new UnauthorizedError("Session expired");
  }

  return response;
}

export async function authenticate(username, password) {
  const response = await fetch(`${API_BASE_PATH}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  if (response.status === 200) {
    const payload = await response.json();
    setSessionCookies(payload.token, payload.expiresAt);
    return 200;
  }

  if (response.status === 401) {
    return 401;
  }

  throw new Error(`Unexpected response status: ${response.status}`);
}

export async function fetchIdentities() {
  const response = await requestWithAuthentication("identities", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch identities: ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload.identities) ? payload.identities : [];
}

export async function createIdentity(
  firstName,
  lastName,
  campus,
  grade,
  section,
  house,
  contactIds
) {
  const sanitizedContactIds = Array.isArray(contactIds)
    ? [...new Set(contactIds.filter((value) => value !== null && value !== ""))]
    : [];

  const response = await requestWithAuthentication("identities", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      firstName,
      lastName,
      campus,
      grade,
      section,
      house,
      contactIds: sanitizedContactIds,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create identity: ${response.status}`);
  }

  const payload = await response.json();
  return payload.id ?? null;
}

export async function startCaptureLinkSession(activeIdentities) {
  const identityIds = Array.isArray(activeIdentities)
    ? activeIdentities
        .map((identity) => identity?.id)
        .filter((id) => typeof id === "string")
    : [];

  if (identityIds.length === 0) {
    return null;
  }

  const response = await requestWithAuthentication("session-start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ identityIds }),
  });

  if (!response.ok) {
    throw new Error(`Failed to start session: ${response.status}`);
  }

  const payload = await response.json();
  return payload.sessionId ?? null;
}

export async function endCaptureLinkSession(sessionId) {
  if (!sessionId) {
    return false;
  }

  const response = await requestWithAuthentication("session-end", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to end session: ${response.status}`);
  }

  const payload = await response.json();
  return Boolean(payload.success);
}

// GUI Helpers
function getUniqueKeys(objectArray) {
  const keys = [];
  objectArray.forEach((obj) => {
    Object.keys(obj).forEach((key) => {
      if (!keys.includes(key)) {
        keys.push(key);
      }
    });
  });
  return keys;
}

export function getObjectArrayFilterObject(objectArray) {
  const uniqueKeys = getUniqueKeys(objectArray);
  const options = {};

  uniqueKeys.forEach((key) => {
    const values = objectArray.map((item) => item[key]);
    let uniqueValues = [...new Set(values)];
    uniqueValues = uniqueValues.filter(
      (value) => value !== null && value !== "" && value !== undefined
    );

    if (uniqueValues.length < 50) {
      if (uniqueValues.every((value) => value === null)) {
        return;
      } else if (uniqueValues.every((value) => typeof value === "string")) {
        options[key] = uniqueValues.sort();
      } else if (uniqueValues.every((value) => typeof value === "number")) {
        options[key] = uniqueValues.sort((a, b) => a - b);
      } else {
        options[key] = uniqueValues;
      }
    }
  });
  return options;
}

export function getCampusString(campus) {
  switch (campus) {
    case "CHBC":
      return "Crescent Hill";
    case "HLCS":
      return "Cottage School";
    case "SM":
      return "Spring Meadows";
    case null:
      return "None";
    default:
      return campus;
  }
}

export function getGradeString(grade) {
  switch (grade) {
    case -2:
      return "Junior Kindergarten";
    case -1:
      return "Kindergarten";
    case 0:
      return "Faculty";
    case 1:
      return "First Grade";
    case 2:
      return "Second Grade";
    case 3:
      return "Third Grade";
    case 4:
      return "Fourth Grade";
    case 5:
      return "Fifth Grade";
    case 6:
      return "Sixth Grade";
    case 7:
      return "Seventh Grade";
    case 8:
      return "Eighth Grade";
    case 9:
      return "Ninth Grade";
    case 10:
      return "Tenth Grade";
    case 11:
      return "Eleventh Grade";
    case 12:
      return "Twelfth Grade";
    default:
      return `${grade}`;
  }
}

export function getHouseString(house) {
  switch (house) {
    case "A":
      return "House of Andrew";
    case "D":
      return "House of David";
    case "G":
      return "House of George";
    case "P":
      return "House of Patrick";
    default:
      return house;
  }
}
