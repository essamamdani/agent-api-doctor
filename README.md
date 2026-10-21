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

For scripts and CI, pass `--json` to print the same checks as a JSON object:

```sh
node src/doctor.mjs --json
```

The report contains only check results and the HTTP status; credentials and response bodies are not included. The process exits nonzero when chat completion or the forced tool-call check fails.

## Checks

- `GET /models`: reports whether the route works and whether the requested ID is listed. A missing model-list route is reported as unsupported rather than treated as a failure.
- `POST /chat/completions`: checks the endpoint returns a successful response.
- Forced function call: checks a named tool call and JSON arguments are returned. The function is never run.

The probe uses the Chat Completions tool-call shape. It does not test the Responses API, Anthropic Messages, image generation, streaming, provider-specific reasoning fields, rate limits, or production reliability. OpenAI-compatible APIs vary; see the provider's current documentation before relying on any feature.

## Smoke-test fill-in-the-middle (FIM) autocomplete

`src/fim-doctor.mjs` sends a tiny synthetic code gap to an OpenAI-compatible `POST /completions` endpoint and reports HTTP status, latency, and the returned text. It does not score code quality or prove compatibility with a specific editor. FIM token strings are model-specific; copy them from the model or provider documentation instead of assuming one template works everywhere.

```sh
export OPENAI_BASE_URL="http://127.0.0.1:8317/v1"
export OPENAI_API_KEY="your-local-provider-key"
export OPENAI_MODEL="your-model-id"
export OPENAI_FIM_PREFIX="<fim_prefix>"
export OPENAI_FIM_SUFFIX="<fim_suffix>"
export OPENAI_FIM_MIDDLE="<fim_middle>"
node src/fim-doctor.mjs
```

The request contains only the synthetic `add(a, b)` example in the script, not your repository. It still leaves your machine for the endpoint you configure; check that provider's retention terms. The sample tokens above are an example only—use the exact format expected by your model.

## Test

```sh
npm test
```

## References

- [OpenAI function calling guide](https://platform.openai.com/docs/guides/function-calling)
- [Essa Mamdani: improving the coding-agent harness](https://essamamdani.com/blog/stop-chasing-ai-model-releases-build-a-better-agent-harness)
- [Essa Mamdani coding-agent directory](https://essamamdani.com/coding-agents)
- [Best AI autocomplete extensions for VS Code](https://essamamdani.com/blog/best-ai-autocomplete-extension-for-vscode)

## License

MIT
