const BUCKET = "patient-records";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function storageConfig() {
  const baseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for record storage");
  return { baseUrl: baseUrl.replace(/\/$/, ""), serviceRoleKey };
}

function objectUrl(key: string) {
  const { baseUrl } = storageConfig();
  return `${baseUrl}/storage/v1/object/${BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function headers(contentType?: string) {
  const { serviceRoleKey } = storageConfig();
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

async function responseError(response: Response) {
  const message = await response.text().catch(() => "");
  return new Error(`Supabase Storage request failed (${response.status}): ${message.slice(0, 300)}`);
}

export async function ensureRecordBucket() {
  const { baseUrl } = storageConfig();
  const response = await fetch(`${baseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers("application/json"), Prefer: "return=minimal" },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: false,
      file_size_limit: MAX_FILE_SIZE,
      allowed_mime_types: ["application/pdf", "image/png", "image/jpeg", "text/plain"],
    }),
  });
  if (response.ok || response.status === 409) return;
  const exists = await fetch(`${baseUrl}/storage/v1/bucket/${BUCKET}`, { headers: headers() });
  if (exists.ok) return;
  throw await responseError(response);
}

export async function uploadRecordObject(key: string, bytes: Uint8Array, contentType: string) {
  if (bytes.byteLength > MAX_FILE_SIZE) throw new Error("Record file exceeds the 5 MB limit");
  const response = await fetch(objectUrl(key), {
    method: "POST",
    headers: { ...headers(contentType), "x-upsert": "true" },
    body: Buffer.from(bytes),
  });
  if (!response.ok) throw await responseError(response);
}

export async function downloadRecordObject(key: string) {
  const response = await fetch(`${objectUrl(key).replace("/object/", "/object/authenticated/")}`, {
    headers: headers(),
  });
  if (!response.ok) throw await responseError(response);
  return { bytes: new Uint8Array(await response.arrayBuffer()), contentType: response.headers.get("content-type") || "application/octet-stream" };
}

export async function deleteRecordObject(key: string) {
  const response = await fetch(objectUrl(key), { method: "DELETE", headers: headers() });
  if (!response.ok && response.status !== 404) throw await responseError(response);
}
