import { chatCompletion, withRetry } from './gemini';
import { supabaseAdmin } from '../config/supabase';
import { embedQuery } from './embeddings';
import { getConfig } from './ragConfig';
import { PRODUCTS } from '../data/products';

// Model, top-k, similarity floor, max tokens and temperature are all runtime-
// editable from the admin console (advisor_* keys in services/ragConfig.ts).
// Products cluster fairly tightly, so the floor mainly guards the "nothing in
// the shop fits" case; the prompt still recommends only from what's retrieved.

const productById = new Map(PRODUCTS.map((p) => [p.id, p]));

export interface ProductAdvice {
  answer: string;
  productIds: string[];
}

/**
 * Retrieve the shop products most relevant to a described need, then have the
 * LLM recommend from ONLY those, with reasons. Returns the answer plus the
 * product ids so the frontend can render the matching cards.
 */
export async function adviseProducts(question: string): Promise<ProductAdvice> {
  const cfg = await getConfig();
  const queryEmbedding = await embedQuery(question);
  const { data, error } = await supabaseAdmin.rpc('match_products', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: Number(cfg.advisor_top_k),
  });
  if (error) throw new Error(`Product retrieval failed: ${error.message}`);

  const matches = ((data ?? []) as { id: string; similarity: number }[]).filter(
    (m) => m.similarity >= Number(cfg.advisor_min_similarity)
  );
  const products = matches
    .map((m) => productById.get(m.id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (!products.length) {
    return {
      answer:
        "I couldn't find a product in our shop that fits that. Try describing what you need differently, or browse the categories above.",
      productIds: [],
    };
  }

  const context = products
    .map(
      (p, i) =>
        `[${i + 1}] ${p.name} (${p.category}, ${p.price} DT) — ${p.description} Highlights: ${p.highlights.join(', ')}.`
    )
    .join('\n');

  const system = [
    'You are a friendly shopping assistant for MediConnect, an online parapharmacy.',
    "Recommend from ONLY the products in the context for the shopper's need.",
    'Rules:',
    '- Recommend 1 to 3 of the listed products, by name, each with a short reason.',
    '- Use only the listed products; never invent products, prices, or medical claims.',
    '- If none truly fit, say so briefly and suggest browsing or the health assistant.',
    '- Be concise and warm. Reply in the same language as the question.',
    '- End with a one-line note that this is shopping help, not medical advice.',
  ].join('\n');

  const completion = await withRetry(() =>
    chatCompletion({
      model: String(cfg.chat_model),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Products:\n${context}\n\nWhat the shopper needs: ${question}` },
      ],
      max_tokens: Number(cfg.advisor_max_tokens),
      temperature: Number(cfg.advisor_temperature),
    })
  );

  const answer =
    completion.choices?.[0]?.message?.content?.trim() || 'Here are some products that may help.';
  return { answer, productIds: products.map((p) => p.id) };
}
