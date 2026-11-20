
async function firestoreRequest(endpoint, options = {}) {
  const url = `${FIREBASE_BASE_URL}/${endpoint}`;

  const headers = {
    "Content-Type": "application/json"
  };

  if (options.idToken) {
    headers.Authorization = `Bearer ${options.idToken}`;
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Firestore request failed");
  }

  return data;
}
