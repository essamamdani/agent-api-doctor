const toolName = "agent_preflight_echo";

export async function runDoctor({ baseUrl, apiKey = "", model, fetchImpl = fetch }) {
  if (!model?.trim()) throw new Error("Set OPENAI_MODEL to the model ID your agent will use.");

  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error("OPENAI_BASE_URL must use HTTP or HTTPS.");
  base.pathname = `${base.pathname.replace(/\/+$/, "")}/`;
  base.search = "";
  base.hash = "";
  const headers = { "content-type": "application/json" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  const request = async (path, init = {}) => fetchImpl(new URL(path, base), {
    ...init,
    headers: { ...headers, ...init.headers },
    signal: AbortSignal.timeout(20_000),
  });

  const modelsResponse = await request("models");
  const models = modelsResponse.ok ? await modelsResponse.json().catch(() => null) : null;
  const modelIds = Array.isArray(models?.data) ? models.data.map((item) => item.id) : [];
  const modelListed = modelIds.includes(model);

  const chatResponse = await request("chat/completions", {
    method: "POST",
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: 'Call the tool once with text exactly "agent-api-doctor".' }],
      tools: [{
        type: "function",
        function: {
          name: toolName,
          description: "Echo a harmless diagnostic string. Do not execute tools.",
          parameters: {
            type: "object",
            properties: { text: { type: "string" } },
            required: ["text"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });

  const payload = chatResponse.ok ? await chatResponse.json().catch(() => null) : null;
  const call = payload?.choices?.[0]?.message?.tool_calls?.find((item) => item?.function?.name === toolName);
  let argumentsValid = false;
  try {
    argumentsValid = JSON.parse(call?.function?.arguments ?? "null")?.text === "agent-api-doctor";
  } catch {}

  return {
    modelsEndpoint: modelsResponse.ok ? "ok" : [404, 405].includes(modelsResponse.status) ? "unsupported" : `http-${modelsResponse.status}`,
    modelListed,
    chatCompletions: chatResponse.ok,
    toolCall: Boolean(call),
    toolArguments: argumentsValid,
    chatStatus: chatResponse.status,
  };
}

export function formatResult(result, json = false) {
  if (json) return JSON.stringify(result, null, 2);
  return [
    `Model list: ${result.modelsEndpoint}${result.modelListed ? " (model ID found)" : ""}`,
    `Chat Completions: ${result.chatCompletions ? "PASS" : `FAIL (HTTP ${result.chatStatus})`}`,
    `Forced tool call: ${result.toolCall ? "PASS" : "FAIL"}`,
    `Tool arguments: ${result.toolArguments ? "PASS" : "FAIL"}`,
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const baseUrl = process.env.OPENAI_BASE_URL || "http://127.0.0.1:8317/v1";
  const json = process.argv.includes("--json");
  try {
    const result = await runDoctor({ baseUrl, apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL });
    console.log(formatResult(result, json));
    if (!result.chatCompletions || !result.toolCall || !result.toolArguments) process.exitCode = 1;
  } catch (error) {
    const message = error.name === "TimeoutError"
      ? "Request timed out after 20 seconds."
      : error.message.startsWith("Set OPENAI_MODEL") || error.message.startsWith("OPENAI_BASE_URL")
        ? error.message
        : "Request failed. Check endpoint connectivity and settings.";
    console.error(json ? JSON.stringify({ error: message }) : message);
    process.exitCode = 1;
  }
}
