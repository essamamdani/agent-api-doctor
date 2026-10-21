import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { runFimDoctor } from "../src/fim-doctor.mjs";

test("sends a synthetic FIM prompt to the OpenAI-compatible completions route", async (t) => {
  const server = createServer(async (req, res) => {
    assert.equal(req.url, "/v1/completions");
    assert.equal(req.headers.authorization, "Bearer test-only");
    let body = "";
    for await (const chunk of req) body += chunk;
    const request = JSON.parse(body);
    assert.equal(request.prompt, "<fim_prefix>function add(a, b) {\n  <fim_suffix>\n}<fim_middle>");
    assert.equal(request.model, "test-model");
    assert.equal(request.stream, false);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ choices: [{ text: "return a + b;" }], usage: { completion_tokens: 5 } }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());

  const { port } = server.address();
  const result = await runFimDoctor({
    baseUrl: `http://127.0.0.1:${port}/v1`,
    apiKey: "test-only",
    model: "test-model",
    fimPrefix: "<fim_prefix>",
    fimSuffix: "<fim_suffix>",
    fimMiddle: "<fim_middle>",
  });
  assert.deepEqual({ ok: result.ok, status: result.status, completion: result.completion, completionTokens: result.completionTokens }, {
    ok: true, status: 200, completion: "return a + b;", completionTokens: 5,
  });
});

test("requires explicit model-specific FIM tokens before making a request", async () => {
  await assert.rejects(runFimDoctor({
    baseUrl: "http://127.0.0.1:8317/v1", model: "test-model",
  }), /OPENAI_FIM_PREFIX/);
});
