# Agent API Doctor

**Does your model endpoint actually work with a coding agent?** This small Node.js smoke test checks model discovery, the OpenAI-compatible Chat Completions route, and a forced function-tool call. It runs on your machine and prints status only; it never executes the returned tool.

It is intentionally narrower than a benchmark: a pass is evidence that one basic tool call worked—not proof that every IDE, agent, model feature, streaming mode, or long coding task is compatible.

## Run it

Requires Node.js 20 or newer. Set your endpoint and model in the environment; keep API keys out of shell history and command-line arguments.

```sh
export OPENAI_BASE_URL="http://127.0.0.1:8317/v1"
export OPENAI_API_KEY="your-local-provider-key"
export OPENAI_MODEL="your-model-id"
node src/doctor.mjs
```

`OPENAI_BASE_URL` defaults to `http://127.0.0.1:8317/v1`. `OPENAI_API_KEY` is optional for local endpoints that do not require authentication. The model ID is required.

The diagnostic sends one synthetic, harmless prompt and a function schema to the endpoint you configure. That request leaves your machine and is subject to that provider's data-retention terms. The tool does not send your repository, prompts, or files. It does not print or save the key or response body.

## Checks

- `GET /models`: reports whether the route works and whether the requested ID is listed. A missing model-list route is reported as unsupported rather than treated as a failure.
- `POST /chat/completions`: checks the endpoint returns a successful response.
- Forced function call: checks a named tool call and JSON arguments are returned. The function is never run.

The probe uses the Chat Completions tool-call shape. It does not test the Responses API, Anthropic Messages, image generation, streaming, provider-specific reasoning fields, rate limits, or production reliability. OpenAI-compatible APIs vary; see the provider's current documentation before relying on any feature.

## Test

```sh
npm test
```

## References

- [OpenAI function calling guide](https://platform.openai.com/docs/guides/function-calling)
- [Essa Mamdani: improving the coding-agent harness](https://essamamdani.com/blog/stop-chasing-ai-model-releases-build-a-better-agent-harness)
- [Essa Mamdani coding-agent directory](https://essamamdani.com/coding-agents)

## License

MIT
