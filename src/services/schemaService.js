let cachedSchema = null;

export async function loadSchema() {
  if (!process.env.LINIQ_URL || !process.env.LINIQ_TOKEN) {
    throw new Error("LINIQ_URL and LINIQ_TOKEN are required to load schema");
  }

  let response;

  try {
    response = await fetch(
      `${process.env.LINIQ_URL}/api/ai/schema`,
      {
        headers: {
          Authorization: `Bearer ${process.env.LINIQ_TOKEN}`,
          Accept: "application/json",
        },
      }
    );
  } catch (error) {
    const cause =
      error.cause?.code || error.cause?.message || error.message;

    throw new Error(`Unable to reach schema service: ${cause}`);
  }

  const data =
    await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Unable to load schema");
  }

  cachedSchema = data?.schema ?? data;

  return cachedSchema;
}

export function getSchema() {
  return cachedSchema;
}
