export const tools = [
  {
    type: "function",
    function: {
      name: "getJobOrderDetails",
      description:
        "Retrieve Job Order details using a Job Order number",
      parameters: {
        type: "object",
        properties: {
          joNo: {
            type: "string",
            description: "Job Order Number"
          }
        },
        required: ["joNo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getTextileDetails",
      description:
        "Retrieve Textile details using a list of RFIDs",
      parameters: {
        type: "object",
        properties: {
          rfids: {
            type: "array",
            items: {
              type: "string"
            },
            description: "List of RFID tags to retrieve details for"
          }
        },
        required: ["rfids"]
      }
    }
  }
];