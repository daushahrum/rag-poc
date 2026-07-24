export async function runAgenticToolLoop({
    maxToolRounds,
    requestAssistant,
    appendToolResults,
    onRoundStart,
}) {
    if (!Number.isInteger(maxToolRounds) || maxToolRounds < 1) {
        throw new Error('maxToolRounds must be a positive integer');
    }

    for (let round = 1; round <= maxToolRounds; round += 1) {
        onRoundStart?.(round);

        const assistantMessage = await requestAssistant(round);
        const toolCalls = Array.isArray(assistantMessage?.tool_calls)
            ? assistantMessage.tool_calls
            : [];

        if (toolCalls.length === 0) {
            return {
                assistantMessage,
                toolRounds: round - 1,
                limitReached: false,
            };
        }

        await appendToolResults(assistantMessage, round);
    }

    return {
        assistantMessage: null,
        toolRounds: maxToolRounds,
        limitReached: true,
    };
}
