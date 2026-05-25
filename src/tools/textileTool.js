export async function getTextileDetails(rfids) {
  const apiToken = process.env.LINIQ_TOKEN;

  if (!apiToken) {
    return {
      error: true,
      message: "LINIQ_TOKEN is not configured",
    };
  }

  try {
    const response = await fetch(
      `https://tliniq.amastsales-sandbox.com/api/textiles/rfidNameAndCategory`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "*/*",
          'Content-Type': "application/json",
        },
        body: JSON.stringify({ rfids }),
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(data ?? response.statusText);

      return {
        error: true,
        message: "Unable to retrieve RFID details",
      };
    }

    return data;
  } catch (error) {
    console.error(error.message);

    return {
      error: true,
      message: "Unable to retrieve RFID details",
    };
  }
}
