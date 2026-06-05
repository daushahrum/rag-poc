export async function callBackendTool(module, action, payload) {
  const apiToken = process.env.LINIQ_TOKEN;

  if (!apiToken) {
    return {
      error: true,
      message: "LINIQ_TOKEN is not configured",
    };
  }

  try {
    const response = await fetch(
        `${process.env.LINIQ_URL}/api/ai/gateway`,
      // `https://tliniq.amastsales-sandbox.com/api/job_order/details/${encodeURIComponent(joNo)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "*/*",
          'Content-Type': "application/json",
        },
        body: JSON.stringify({
          module,
          action,
          params: payload,
        }),
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(data ?? response.statusText);

      return {
        error: true,
        message: "Unable to call backend tool",
      };
    }

    return data;
  } catch (error) {
    console.error(error.message);

    return {
      error: true,
      message: "Unable to call backend tool",
    };
  }
}
