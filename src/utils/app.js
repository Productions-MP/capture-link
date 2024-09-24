import Cookies from "js-cookie";

// Mongo Access Token Cookie Methods
export function getMongoSessionAccessTokenCookie() {
  return Cookies.get("mongoSessionAccessToken");
}

export function setMongoSessionAccessTokenCookie(access_token) {
  Cookies.set("mongoSessionAccessToken", access_token, {
    expires: 1 / 48,
    sameSite: "Strict",
  });
}

export function clearMongoSessionAccessTokenCookie() {
  Cookies.remove("mongoSessionAccessToken");
}

export function hasMongoSessionAccessTokenCookie() {
  const token = getMongoSessionAccessTokenCookie();
  return token !== undefined;
}

// Mongo Refresh Token Cookie Methods
export function getMongoSessionRefreshTokenCookie() {
  return Cookies.get("mongoSessionRefreshToken");
}

export function setMongoSessionRefreshTokenCookie(refresh_token) {
  Cookies.set("mongoSessionRefreshToken", refresh_token, {
    expires: 1,
    sameSite: "Strict",
  });
}

export function clearMongoSessionRefreshTokenCookie() {
  Cookies.remove("mongoSessionRefreshToken");
}

export function hasMongoSessionRefreshTokenCookie() {
  const token = getMongoSessionRefreshTokenCookie();
  return token !== undefined;
}

// Mongo Session Tokens Cookies Methods
export function hasMongoSessionCookies() {
  const aT = hasMongoSessionAccessTokenCookie();
  const rT = hasMongoSessionRefreshTokenCookie();
  return (aT && rT) || (!aT && rT);
}

export function clearMongoSessionCookies() {
  clearMongoSessionAccessTokenCookie();
  clearMongoSessionRefreshTokenCookie();
}

// Mongo CRUD
export async function getMongoSessionTokens(username, password) {
  const response = await fetch(process.env.VUE_APP_MONGO_LOGIN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: username,
      password: password,
    }),
  });

  if (response.ok) {
    const data = await response.json();
    setMongoSessionAccessTokenCookie(data.access_token);
    setMongoSessionRefreshTokenCookie(data.refresh_token);

    return response.status;
  }
  return response.status;
}

export async function refreshMongoSessionAccessToken() {
  const response = await fetch(process.env.VUE_APP_MONGO_SESSION_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getMongoSessionRefreshTokenCookie()}`,
    },
  });

  if (response.ok) {
    const data = await response.json();
    setMongoSessionAccessTokenCookie(data.access_token);
    return true;
  } else return false;
}

// See below comment about CiciCRM integration
// export async function getMongoXCiviAuth() {
//   if (hasMongoSessionAccessTokenCookie()) {
//     const response = await fetch(
//       `${process.env.VUE_APP_MONGO_DATA_ENDPOINT}/findOne`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "Access-Control-Request-Headers": "*",
//           Authorization: `Bearer ${getMongoSessionAccessTokenCookie()}`,
//         },
//         body: JSON.stringify({
//           dataSource: "capture-link",
//           database: "capture-link",
//           collection: "env",
//           filter: { key: "X-Civi-Auth" },
//         }),
//       }
//     );

//     if (response.ok) {
//       const responseObject = await response.json();
//       return responseObject.document.value;
//     }
//   } else if (hasMongoSessionRefreshTokenCookie()) {
//     if (await refreshMongoSessionAccessToken()) {
//       getMongoXCiviAuth();
//     }
//   }
// }

/**
 * create Identity record in MongoDB Cloud database
 * @param {String} firstName
 * @param {String} lastName
 * @param {String} campus
 * @param {Number} grade
 * @param {String} house
 * @param {Array} contactIds
 */
export async function createMongoCaptureLinkIdentity(
  firstName,
  lastName,
  campus,
  grade,
  section,
  house,
  contactIds
) {
  if (hasMongoSessionAccessTokenCookie()) {
    const response = await fetch(
      `${process.env.VUE_APP_MONGO_DATA_ENDPOINT}/insertOne`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          Authorization: `Bearer ${getMongoSessionAccessTokenCookie()}`,
        },
        body: JSON.stringify({
          dataSource: "capture-link",
          database: "capture-link",
          collection: "identities",
          document: {
            first_name: firstName,
            last_name: lastName,
            campus: campus,
            grade: grade,
            section: section,
            house: house,
            contact_ids: contactIds,
          },
        }),
      }
    );

    if (response.ok) {
      const responseObject = await response.json();
      return responseObject.insertedId
    }
    return null;
  } else if (hasMongoSessionRefreshTokenCookie()) {
    if (await refreshMongoSessionAccessToken()) {
      return await createMongoCaptureLinkIdentity(
        firstName,
        lastName,
        campus,
        grade,
        section,
        house,
        contactIds
      );
    }
  }
}

export async function getMongoCaptureLinkIdentities() {
  if (hasMongoSessionAccessTokenCookie()) {
    const allIdentities = [];
    let skip = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(
        `${process.env.VUE_APP_MONGO_DATA_ENDPOINT}/find`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Request-Headers": "*",
            Authorization: `Bearer ${getMongoSessionAccessTokenCookie()}`,
          },
          body: JSON.stringify({
            dataSource: "capture-link",
            database: "capture-link",
            collection: "identities",
            filter: {},
            skip: skip,
            limit: limit,
          }),
        }
      );

      if (response.ok) {
        const responseObject = await response.json();
        const identities = responseObject.documents.map((el) => {
          return {
            id: el._id,
            firstName: el.first_name,
            lastName: el.last_name,
            commonName: el.common_name,
            campus: el.campus,
            grade: el.grade,
            section: el.section,
            house: el.house,
            contactIds: el.contact_ids,
          };
        });

        if (identities.length < limit) {
          hasMore = false;
        }

        allIdentities.push(...identities);
        skip += limit;
      } else {
        console.error(
          "Failed to fetch data:",
          response.status,
          response.statusText
        );
        hasMore = false;
      }
    }

    return allIdentities;
  } else if (hasMongoSessionRefreshTokenCookie()) {
    if (await refreshMongoSessionAccessToken()) {
      return await getMongoCaptureLinkIdentities();
    }
  }
  return [];
}

/**
 * create Session record without end datetime in MongoDB Cloud database
 * @param {Array} activeIdentities
 * @returns {Promise<String>} ObjectId() of Session record
 */
export async function postMongoCaptureLinkSessionStart(activeIdentities) {
  if (hasMongoSessionAccessTokenCookie()) {
    const response = await fetch(
      `${process.env.VUE_APP_MONGO_DATA_ENDPOINT}/insertOne`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          Authorization: `Bearer ${getMongoSessionAccessTokenCookie()}`,
        },
        body: JSON.stringify({
          dataSource: "capture-link",
          database: "capture-link",
          collection: "sessions",
          document: {
            session_start: Date.now(),
            session_end: null,
            identities: activeIdentities.map((identity) => {
              return { $oid: identity.id };
            }),
          },
        }),
      }
    );

    if (response.ok) {
      const responseObject = await response.json();
      return responseObject.insertedId;
    }
  } else if (hasMongoSessionRefreshTokenCookie()) {
    if (await refreshMongoSessionAccessToken()) {
      return await postMongoCaptureLinkSessionStart(activeIdentities);
    }
  }
}

export async function postMongoCaptureLinkSessionEnd(objectId) {
  if (hasMongoSessionAccessTokenCookie()) {
    const response = await fetch(
      `${process.env.VUE_APP_MONGO_DATA_ENDPOINT}/updateOne`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          Authorization: `Bearer ${getMongoSessionAccessTokenCookie()}`,
        },
        body: JSON.stringify({
          dataSource: "capture-link",
          database: "capture-link",
          collection: "sessions",
          filter: {
            _id: { $oid: objectId },
          },
          update: {
            $set: { session_end: Date.now() },
          },
          upsert: false,
        }),
      }
    );

    if (response.ok) {
      return true;
    }
  } else if (hasMongoSessionRefreshTokenCookie()) {
    if (await refreshMongoSessionAccessToken()) {
      return await postMongoCaptureLinkSessionEnd(objectId);
    }
  }
}

// CiviCRM CRUD
// I could not get CORS figured out with CiviCRM in a timely manner, so I am using
// a python script to query CiviCRM contacts and create identities in MongoDB.

// export async function getCiviContactWithQuery(queryObject) {
//   const response = await fetch(
//     `${process.env.VUE_APP_CIVI_GET_CONTACT}?params=${encodeURI(
//       JSON.stringify(queryObject)
//     )}`,
//     {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "Access-Control-Allow-Origin": "*",
//         "X-Requested-With": "XMLHttpRequest",
//         "X-Civi-Auth": `Bearer ${await getMongoXCiviAuth()}`,
//       },
//     }
//   );
//   const data = await response.json();
//   return data;
// }

// export async function getIdentitiesFromCiviCurrentStudents() {
//   const getCiviCurrentStudents = {
//     select: [
//       "custom_child_info.First_Name",
//       "custom_child_info.Last_Name",
//       "custom_child_info.Campus_Assignment",
//       "custom_child_info.Grade",
//       "custom_child_info.House",
//       "id",
//     ],
//     join: [["Custom_Child_Info AS custom_child_info", "LEFT"]],
//     where: [["custom_child_info.HLS_Status", "CONTAINS", "Current Student"]],
//   };

//   const civiContacts = await getCiviContactWithQuery(getCiviCurrentStudents);

//   const identityMap = {};

//   civiContacts.values.forEach((student) => {
//     const {
//       "custom_child_info.First_Name": firstName,
//       "custom_child_info.Last_Name": lastName,
//       "custom_child_info.Campus_Assignment": campus,
//       "custom_child_info.Grade": grade,
//       "custom_child_info.House": house,
//       id: contactIds,
//     } = student;

//     if (!firstName || !lastName) {
//       return;
//     }

//     const key = `${firstName}${lastName}${campus}${grade}`;

//     if (!identityMap[key]) {
//       identityMap[key] = {
//         firstName,
//         lastName,
//         campus,
//         grade,
//         house: house !== "" ? house : null,
//         contactIds: [contactIds],
//       };
//     } else {
//       identityMap[key].contactIds.push(contactIds);
//     }
//   });

//   return Object.values(identityMap);
// }

// export async function getIdentitiesFromCiviCurrentTeachers() {
//   const getCiviCurrentTeachers = {
//     select: ["id", "first_name", "last_name"],
//     where: [["Faculty_Info.Faculty_Status", "=", "2"]],
//   };

//   const civiContacts = getCiviContactWithQuery(getCiviCurrentTeachers);

//   const identityMap = {};

//   civiContacts.values.forEach((teacher) => {
//     const {
//       id: contactIds,
//       first_name: firstName,
//       last_name: lastName,
//     } = teacher;

//     if (!firstName || !lastName) {
//       return;
//     }

//     const key = `${firstName}${lastName}`;

//     if (!identityMap[key]) {
//       identityMap[key] = {
//         firstName,
//         lastName,
//         campus: null,
//         grade: 0,
//         house: null,
//         contactIds: [contactIds],
//       };
//     } else {
//       identityMap[key].contactIds.push(contactIds);
//     }
//   });

//   return Object.values(identityMap);
// }

// Wrapper Methods
export async function getIdentities() {
  var identities = [];
  identities = identities.concat(await getMongoCaptureLinkIdentities());
  // identities = identities.concat(await getIdentitiesFromCiviCurrentStudents());
  // identities = identities.concat(await getIdentitiesFromCiviCurrentTeachers());
  return identities;
}

// GUI Methods
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
  }
}
