import { getHfClient, withHfRetry } from './hfClient';
import { retrieveChunks, type RetrievedChunk } from './retrieval';

// The generation model (see RAG.md Phase 0). Overridable via env so it can be
// swapped without a code change if a provider stops serving it on the free tier.
const CHAT_MODEL = process.env.HF_CHAT_MODEL || 'Qwen/Qwen2.5-7B-Instruct';

// Below this top similarity, treat retrieval as "nothing relevant" and refuse
// WITHOUT spending an LLM call. Kept deliberately low: e5 similarity scores sit
// in a narrow high band (an off-topic question still scores ~0.82), so this is
// only a floor for the truly-empty case — the real guardrail is the grounding
// prompt below, which makes the model refuse when the context doesn't answer.
const MIN_TOP_SIMILARITY = 0.78;

// How many retrieved chunks to feed the model as context.
const CONTEXT_CHUNKS = 5;

const REFUSAL: Record<'en' | 'fr', string> = {
  en: "I don't have information on that in our articles. For anything specific, please book an appointment with a doctor.",
  fr: "Je n'ai pas d'information à ce sujet dans nos articles. Pour toute question précise, veuillez prendre rendez-vous avec un médecin.",
};

// The grounding instructions — the primary safety mechanism. The model must
// answer only from the supplied context and refuse otherwise.
function buildMessages(question: string, chunks: RetrievedChunk[]) {
  const context = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n---\n\n');

  const system = [
    'You are a health information assistant for MediConnect, a doctor appointment platform.',
    'Answer the user question using ONLY the numbered context passages below, which are excerpts from articles written by doctors on the platform.',
    'Rules:',
    '- Base every statement on the context. Never add facts from your own knowledge.',
    '- If the context does not contain the answer, say so plainly and suggest booking a doctor — do not guess or invent.',
    '- Be concise: a short paragraph or a few bullet points.',
    '- Never give a diagnosis or prescribe medication or doses.',
    '- Reply in the same language as the question.',
    '- End with a one-line reminder that this is general information, not a substitute for a consultation.',
  ].join('\n');

  const user = `Context:\n${context}\n\nQuestion: ${question}`;

  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ];
}

export interface AnswerResult {
  answer: string;
  grounded: boolean; // false when we refused without (or before) trusting the model
  chunks: RetrievedChunk[]; // the retrieved chunks, so the route can build citations
}

/**
 * The full RAG "ask": retrieve, then either refuse (nothing relevant) or ask
 * the LLM to answer strictly from the retrieved context.
 */
export async function answerQuestion(
  question: string,
  opts: { lang?: 'en' | 'fr' | null } = {}
): Promise<AnswerResult> {
  const lang = opts.lang ?? null;
  const chunks = await retrieveChunks(question, { lang, limit: CONTEXT_CHUNKS });
  const refusalLang: 'en' | 'fr' = lang ?? 'en';

  // Guardrail 1: nothing retrieved, or nothing even close — refuse, no LLM call.
  if (!chunks.length || chunks[0].similarity < MIN_TOP_SIMILARITY) {
    return { answer: REFUSAL[refusalLang], grounded: false, chunks };
  }

  // Guardrail 2: the grounding prompt. The model answers only from context and
  // refuses on its own when the retrieved passages don't address the question.
  const hf = getHfClient();
  const completion = await withHfRetry(() =>
    hf.chatCompletion({
      model: CHAT_MODEL,
      messages: buildMessages(question, chunks),
      max_tokens: 500,
      temperature: 0.3, // low — this is factual grounding, not creative writing
    })
  );

  const answer = completion.choices?.[0]?.message?.content?.trim();
  if (!answer) return { answer: REFUSAL[refusalLang], grounded: false, chunks };

  return { answer, grounded: true, chunks };
}
