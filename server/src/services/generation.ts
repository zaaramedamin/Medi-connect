import { chatCompletion, withRetry } from './gemini';
import { retrieveChunks, type RetrievedChunk } from './retrieval';
import { getConfig } from './ragConfig';

// All the tunables below (generation model, similarity floor, context size,
// max tokens, temperatures) are now runtime-editable from the admin console —
// they're read from getConfig() per request. See services/ragConfig.ts for the
// defaults and the rationale that used to live in these constants:
//   - min_top_similarity: below it, refuse WITHOUT an LLM call. Deliberately
//     low because relevant and off-topic scores overlap near 0.67; the real guardrail is
//     the grounding prompt, which refuses when the context doesn't answer.
//   - context_chunks: how many retrieved chunks are fed to the model.

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

export type AssistantMode = 'articles' | 'general';

// General-knowledge mode: no retrieval — the model answers from its own medical
// knowledge, with the same safety rails as the grounded mode.
const GENERAL_SYSTEM = [
  'You are a helpful health information assistant for MediConnect.',
  "Answer the user's health question clearly and accurately from general medical knowledge.",
  'Rules:',
  '- Be concise and easy to understand.',
  '- Never give a specific diagnosis or prescribe medication or doses.',
  '- For anything urgent, serious, or personal, tell them to book an appointment with a doctor.',
  '- Reply in the same language as the question.',
  '- End with a one-line reminder that this is general information, not a substitute for a consultation.',
].join('\n');

export interface AnswerResult {
  answer: string;
  grounded: boolean; // true only when the answer is grounded in retrieved articles
  chunks: RetrievedChunk[]; // the retrieved chunks, so the route can build citations
}

/**
 * The full RAG "ask": retrieve, then either refuse (nothing relevant) or ask
 * the LLM to answer strictly from the retrieved context.
 */
export async function answerQuestion(
  question: string,
  opts: { lang?: 'en' | 'fr' | null; mode?: AssistantMode } = {}
): Promise<AnswerResult> {
  const lang = opts.lang ?? null;
  const mode: AssistantMode = opts.mode ?? 'articles';
  const refusalLang: 'en' | 'fr' = lang ?? 'en';
  const cfg = await getConfig();
  const chatModel = String(cfg.chat_model);
  const maxTokens = Number(cfg.answer_max_tokens);

  // General mode: answer from the model's own knowledge, no retrieval, no sources.
  if (mode === 'general') {
    const completion = await withRetry(() =>
      chatCompletion({
        model: chatModel,
        messages: [
          { role: 'system', content: GENERAL_SYSTEM },
          { role: 'user', content: question },
        ],
        max_tokens: maxTokens,
        temperature: Number(cfg.general_temperature),
      })
    );
    const answer = completion.choices?.[0]?.message?.content?.trim() || REFUSAL[refusalLang];
    return { answer, grounded: false, chunks: [] };
  }

  // Articles mode: grounded RAG over the doctor articles.
  const chunks = await retrieveChunks(question, { lang, limit: Number(cfg.context_chunks) });

  // Guardrail 1: nothing relevant retrieved. Check the best cosine across the
  // pool (hybrid ranking may not put the highest-cosine chunk first) — if even
  // the closest article is too far, refuse without an LLM call.
  const topSim = chunks.reduce((max, c) => Math.max(max, c.similarity), 0);
  if (!chunks.length || topSim < Number(cfg.min_top_similarity)) {
    return { answer: REFUSAL[refusalLang], grounded: false, chunks };
  }

  // Guardrail 2: the grounding prompt. The model answers only from context and
  // refuses on its own when the retrieved passages don't address the question.
  const completion = await withRetry(() =>
    chatCompletion({
      model: chatModel,
      messages: buildMessages(question, chunks),
      max_tokens: maxTokens,
      temperature: Number(cfg.grounded_temperature), // low — factual grounding
    })
  );

  const answer = completion.choices?.[0]?.message?.content?.trim();
  if (!answer) return { answer: REFUSAL[refusalLang], grounded: false, chunks };

  return { answer, grounded: true, chunks };
}
