-- MediConnect — Community: doctor reports, advice ("conseils") & discussion
-- Run this in the Supabase SQL Editor AFTER schema.sql and seed.sql.
-- Safe to re-run (idempotent).

-- ─────────────────────────────────────────────────────────────────────
-- 1. Articles (authored by doctors) + comments (discussion, any user)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id BIGSERIAL PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'advice' CHECK (category IN ('report', 'advice', 'discussion')),
  excerpt TEXT,
  body TEXT NOT NULL,
  cover_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_created ON articles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles (category);

CREATE TABLE IF NOT EXISTS article_comments (
  id BIGSERIAL PRIMARY KEY,
  article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_article ON article_comments (article_id, created_at);

-- ─────────────────────────────────────────────────────────────────────
-- 2. Row Level Security
--    Articles: public read; a doctor manages only their own posts.
--    Comments: public read; any signed-in user posts/removes their own.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read articles" ON articles;
DROP POLICY IF EXISTS "Doctor can insert own article" ON articles;
DROP POLICY IF EXISTS "Doctor can update own article" ON articles;
DROP POLICY IF EXISTS "Doctor can delete own article" ON articles;

CREATE POLICY "Public can read articles" ON articles FOR SELECT USING (true);
CREATE POLICY "Doctor can insert own article" ON articles FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Doctor can update own article" ON articles FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Doctor can delete own article" ON articles FOR DELETE USING (auth.uid() = author_id);

ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read comments" ON article_comments;
DROP POLICY IF EXISTS "Authed can add own comment" ON article_comments;
DROP POLICY IF EXISTS "Author can delete own comment" ON article_comments;

CREATE POLICY "Public can read comments" ON article_comments FOR SELECT USING (true);
CREATE POLICY "Authed can add own comment" ON article_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Author can delete own comment" ON article_comments FOR DELETE USING (auth.uid() = author_id);

-- ─────────────────────────────────────────────────────────────────────
-- 3. Sample content (only when the table is empty, so re-runs are safe)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO articles (author_id, title, category, excerpt, body)
SELECT v.author_id::uuid, v.title, v.category, v.excerpt, v.body
FROM (VALUES
  (
    'd0000000-0000-4000-a000-000000000002',
    'Understanding your blood pressure numbers',
    'advice',
    'What the top and bottom numbers really mean, and simple habits that keep them in a healthy range.',
    E'Blood pressure is written as two numbers — systolic over diastolic. The systolic (top) number is the pressure when your heart beats; the diastolic (bottom) number is the pressure between beats.\n\nA reading around 120/80 mmHg is generally considered healthy. Consistently above 140/90 mmHg may signal hypertension and is worth discussing with your doctor.\n\nSmall daily habits make a real difference: reduce added salt, stay active for 30 minutes most days, limit alcohol, sleep well, and manage stress. If you monitor at home, measure at the same time each day while seated and rested.'
  ),
  (
    'd0000000-0000-4000-a000-000000000004',
    'When should you keep a child home from school?',
    'advice',
    'A practical guide for parents on fevers, coughs, and when rest at home is the right call.',
    E'Deciding whether to send your child to school can be tricky. As a general rule, keep them home if they have a fever above 38°C, are too tired or unwell to take part, or have symptoms that spread easily.\n\nA mild runny nose without a fever is usually fine. But vomiting, diarrhoea, or an unexplained rash deserve a day of rest and a closer look.\n\nReturn to school once your child has been fever-free for 24 hours without medication and has the energy to participate. When in doubt, a quick consultation can save a longer illness.'
  ),
  (
    'd0000000-0000-4000-a000-000000000009',
    'A simple daily routine for healthy skin',
    'advice',
    'You do not need ten products. Three consistent steps protect and nourish most skin types.',
    E'Good skin care is about consistency, not complexity. For most people, three steps are enough: a gentle cleanser in the morning and evening, a moisturiser suited to your skin type, and — crucially — a broad-spectrum SPF 30+ every morning.\n\nSunscreen is the single most effective anti-ageing and skin-cancer-prevention step you can take. Reapply it if you are outdoors for long periods.\n\nIntroduce active ingredients like retinol slowly, and patch-test new products. If you have persistent acne, redness, or a changing mole, book a consultation rather than self-treating.'
  ),
  (
    'd0000000-0000-4000-a000-000000000001',
    'Seasonal flu report: what we are seeing this month',
    'report',
    'A short public update on circulating respiratory infections and who should consider vaccination.',
    E'Over the past few weeks we have seen a steady rise in seasonal respiratory infections, mostly mild and self-limiting. Symptoms typically include fever, body aches, sore throat, and a dry cough lasting several days.\n\nMost people recover at home with rest and fluids. Seek care if you experience shortness of breath, a fever that will not settle, or if symptoms worsen after initially improving.\n\nVaccination remains the best protection, especially for people over 65, pregnant women, and those with chronic conditions. Simple measures — handwashing, staying home when unwell, and ventilating rooms — meaningfully reduce spread.'
  ),
  (
    'd0000000-0000-4000-a000-000000000012',
    'Small steps that protect your mental health',
    'discussion',
    'Let us share the everyday habits that help our patients stay balanced. Here are a few that I recommend.',
    E'Mental health is built in small, repeatable habits. A few that I find genuinely help: keep a consistent sleep schedule, get daylight early in the day, move your body, and stay connected to people who matter.\n\nLimiting doom-scrolling before bed and setting realistic daily goals also reduce anxiety for many patients.\n\nI would love to hear from colleagues: what simple, practical advice do you give patients that actually sticks? Let us build a shared list below.'
  )
) AS v(author_id, title, category, excerpt, body)
WHERE NOT EXISTS (SELECT 1 FROM articles);

-- Sample discussion (only when there are no comments yet)
INSERT INTO article_comments (article_id, author_id, body)
SELECT c.article_id, c.author_id::uuid, c.body
FROM (VALUES
  (
    (SELECT id FROM articles WHERE title = 'Small steps that protect your mental health' LIMIT 1),
    'd0000000-0000-4000-a000-000000000004',
    'Great list. I also ask parents to protect a screen-free wind-down routine — it helps the whole family.'
  ),
  (
    (SELECT id FROM articles WHERE title = 'Small steps that protect your mental health' LIMIT 1),
    'a0000000-0000-4000-a000-000000000001',
    'As a patient, the "daylight early in the day" tip genuinely changed my mornings. Thank you.'
  ),
  (
    (SELECT id FROM articles WHERE title = 'Understanding your blood pressure numbers' LIMIT 1),
    'a0000000-0000-4000-a000-000000000002',
    'Very clear explanation — I finally understand what the two numbers mean.'
  )
) AS c(article_id, author_id, body)
WHERE NOT EXISTS (SELECT 1 FROM article_comments);
