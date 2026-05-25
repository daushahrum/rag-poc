export async function getJobOrderDetails(joNo) {
  const apiToken = process.env.LINIQ_TOKEN;

  if (!apiToken) {
    return {
      error: true,
      message: "LINIQ_TOKEN is not configured",
    };
  }

  try {
    const response = await fetch(
      `https://tliniq.amastsales-sandbox.com/api/job_order/details/${encodeURIComponent(joNo)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "*/*",
        },
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(data ?? response.statusText);

      return {
        error: true,
        message: "Unable to retrieve Job Order",
      };
    }

    return data;
  } catch (error) {
    console.error(error.message);

    return {
      error: true,
      message: "Unable to retrieve Job Order",
    };
  }
}
