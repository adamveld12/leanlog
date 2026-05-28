interface AiGenerationEvent {
  distinctId: string;
  model: string;
  provider: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  isError?: boolean;
  error?: string;
  endpoint: string;
}

export function captureAiGeneration(
  apiKey: string,
  host: string,
  event: AiGenerationEvent,
): Promise<Response> {
  return fetch(`${host}/i/v0/e/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      distinct_id: event.distinctId,
      event: '$ai_generation',
      properties: {
        $ai_provider: event.provider,
        $ai_model: event.model,
        $ai_latency: event.latencyMs / 1000,
        $ai_input_tokens: event.inputTokens,
        $ai_output_tokens: event.outputTokens,
        $ai_is_error: event.isError ?? false,
        $ai_error: event.error,
        endpoint: event.endpoint,
      },
    }),
  });
}
