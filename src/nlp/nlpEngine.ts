import type { NLPResult } from '../types';
import { NLPExtractionError, NLPTimeoutError } from '../types/errors';

export interface NLPEngine {
  extract(input: string): Promise<NLPResult>;
}

const NLP_TIMEOUT_MS = 3000;

const SYSTEM_PROMPT = `You are a graph extraction assistant. Given a problem description, extract tasks as nodes and their relationships as edges.
Return ONLY valid JSON in this exact format:
{
  "nodes": [{ "id": "string", "label": "string" }],
  "edges": [{ "sourceId": "string", "targetId": "string", "weight": number, "label": "string" }]
}
Use short unique IDs (e.g. "n1", "n2"). Weight defaults to 1 if not specified. No extra text.`;

async function callLLM(input: string): Promise<NLPResult> {
  const apiKey = process.env.NLP_API_KEY ?? '';
  const apiUrl = process.env.NLP_API_URL ?? 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: input },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    throw new NLPExtractionError(
      `LLM request failed with status ${response.status}. Please try again.`,
    );
  }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new NLPExtractionError(
      'The AI response could not be parsed. Please rephrase your input.',
    );
  }

  const result = parsed as NLPResult;

  if (
    !result ||
    !Array.isArray(result.nodes) ||
    !Array.isArray(result.edges)
  ) {
    throw new NLPExtractionError(
      'The AI response did not conform to the expected schema. Please rephrase your input.',
    );
  }

  return result;
}

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new NLPTimeoutError()), ms),
  );
}

export const NLPEngine: NLPEngine = {
  async extract(input: string): Promise<NLPResult> {
    const result = await Promise.race([
      callLLM(input),
      timeoutPromise(NLP_TIMEOUT_MS),
    ]);

    if (!result.nodes || result.nodes.length < 2) {
      throw new NLPExtractionError(
        'Not enough tasks were found in your input. Please provide more detail.',
      );
    }

    return result;
  },
};
