const before = "function add(a, b) {\n  ";
const after = "\n}";

export async function runFimDoctor({
  baseUrl,
  apiKey = "",
  model,
  fimPrefix,
  fimSuffix,
  fimMiddle,
  fetchImpl = fetch,
}) {
  if (!model?.trim()) throw new Error("Set OPENAI_MODEL to the model ID your agent will use.");
  if (![fimPrefix, fimSuffix, fimMiddle].every((token) => typeof token === "string" && token.length)) {
    throw new Error("Set OPENAI_FIM_PREFIX, OPENAI_FIM_SUFFIX, and OPENAI_FIM_MIDDLE for this model's FIM format.");
  }

  const base = new URL(baseUrl);
  if (!["http:", "https:"].includes(base.protocol)) throw new Error("OPENAI_BASE_URL must use HTTP or HTTPS.");
  base.pathname = `${base.pathname.replace(/\/+$/, "")}/`;
  base.search = "";
  base.hash = "";
  const headers = { "content-type": "application/json" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  const started = Date.now();
  const response = await fetchImpl(new URL("completions", base), {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      prompt: `${fimPrefix}${before}${fimSuffix}${after}${fimMiddle}`,
      max_tokens: 48,
      temperature: 0,
      stream: false,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = response.ok ? await response.json().catch(() => null) : null;
  const completion = payload?.choices?.[0]?.text;

  return {
    ok: response.ok && typeof completion === "string" && completion.trim().length > 0,
    status: response.status,
    latencyMs: Date.now() - started,
    completion: typeof completion === "string" ? completion : "",
    completionTokens: Number.isInteger(payload?.usage?.completion_tokens) ? payload.usage.completion_tokens : null,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await runFimDoctor({
      baseUrl: process.env.OPENAI_BASE_URL || "http://127.0.0.1:8317/v1",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
      fimPrefix: process.env.OPENAI_FIM_PREFIX,
      fimSuffix: process.env.OPENAI_FIM_SUFFIX,
      fimMiddle: process.env.OPENAI_FIM_MIDDLE,
    });
    console.log(`FIM endpoint: ${result.ok ? "PASS" : "FAIL"} (HTTP ${result.status}, ${result.latencyMs} ms)`);
    if (result.completionTokens !== null) console.log(`Completion tokens: ${result.completionTokens}`);
    if (result.completion) console.log(`\nCompletion (not quality-scored):\n${result.completion}`);
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(error.name === "TimeoutError" ? "Request timed out after 20 seconds." : error.message);
    process.exitCode = 1;
  }
}
