const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function jsonResponse(statusCode, body = {}, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...DEFAULT_HEADERS, ...extraHeaders },
    body: JSON.stringify(body),
  };
}

function optionsResponse(allowedMethods = 'GET,POST,PUT,OPTIONS') {
  return {
    statusCode: 200,
    headers: {
      ...DEFAULT_HEADERS,
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': allowedMethods,
    },
    body: '',
  };
}

module.exports = {
  jsonResponse,
  optionsResponse,
};
