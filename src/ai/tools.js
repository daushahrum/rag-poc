export const tools = [
  {
    type: "function",
    function: {
      name: "callBackendTool",
      description:
        "Call a backend module/action using the loaded API schema. Use this when the user asks for live operational data. Choose the module, action, and payload from the schema provided in the system prompt.",
      parameters: {
        type: "object",
        properties: {
          module: {
            type: "string",
            description: "Backend module name from the schema"
          },
          action: {
            type: "string",
            description: "Backend action/operation name from the schema"
          },
          payload: {
            type: "object",
            description: "Payload required by the selected action"
          }
        },
        required: ["module", "action", "payload"]
      }
    }
  }
];
