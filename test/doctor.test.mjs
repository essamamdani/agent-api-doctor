import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { formatResult, runDoctor } from "../src/doctor.mjs";

test("checks model discovery and a forced tool call without executing it", async (t) => {
  const server = createServer(async (req, res) => {
    if (req.url === "/v1/models") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "test-model" }] }));
      return;
    }
    if (req.url === "/v1/chat/completions") {
      assert.equal(req.headers.authorization, "Bearer test-only");
      let body = "";
      for await (const chunk of req) body += chunk;
      const request = JSON.parse(body);
      assert.equal(request.tool_choice.function.name, "agent_preflight_echo");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { tool_calls: [{ function: {
        name: "agent_preflight_echo", arguments: '{"text":"agent-api-doctor"}',
      } }] } }] }));
      return;
    }
    res.writeHead(404).end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());

  const { port } = server.address();
  const result = await runDoctor({ baseUrl: `http://127.0.0.1:${port}/v1`, apiKey: "test-only", model: "test-model" });
  assert.deepEqual(result, {
    modelsEndpoint: "ok", modelListed: true, chatCompletions: true,
    toolCall: true, toolArguments: true, chatStatus: 200,
  });
});

test("rejects a missing model before making a request", async () => {
  await assert.rejects(runDoctor({ baseUrl: "http://127.0.0.1:8317/v1", model: "" }), /OPENAI_MODEL/);
});

test("formats a stable JSON report without endpoint credentials", () => {
  const report = { modelsEndpoint: "ok", modelListed: true, chatCompletions: true, toolCall: true, toolArguments: true, chatStatus: 200 };
  assert.deepEqual(JSON.parse(formatResult(report, true)), report);
});
