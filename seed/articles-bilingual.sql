-- MediConnect — Bilingual community articles (EN + FR) & RAG knowledge base
-- Run this in the Supabase SQL Editor AFTER schema.sql, seed.sql and community.sql.
-- Safe to re-run (idempotent).
--
-- What it does:
--   1. Adds French columns (title_fr / excerpt_fr / body_fr) to articles.
--      The UI shows the French text when the visitor is in FR mode and falls
--      back to English otherwise. One row = one article = one discussion.
--   2. Backfills French translations for the 5 original sample articles.
--   3. Inserts 30 new doctor-authored articles (12 advice, 10 reports,
--      8 discussions), each written in both English and French. Together
--      with the originals they form the knowledge base the RAG health
--      assistant retrieves from.

-- ─────────────────────────────────────────────────────────────────────
-- 1. French columns
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE articles ADD COLUMN IF NOT EXISTS title_fr   TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS excerpt_fr TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS body_fr    TEXT;

-- ─────────────────────────────────────────────────────────────────────
-- 2. French translations for the 5 original sample articles
--    (matched by their English title; only fills rows still missing FR)
-- ─────────────────────────────────────────────────────────────────────
UPDATE articles SET
  title_fr   = $txt$Comprendre les chiffres de votre tension artérielle$txt$,
  excerpt_fr = $txt$Ce que signifient vraiment les deux chiffres, et les habitudes simples qui les maintiennent dans une zone saine.$txt$,
  body_fr    = $txt$La tension artérielle s'écrit avec deux chiffres — la systolique sur la diastolique. Le chiffre du haut (systolique) correspond à la pression quand le cœur se contracte ; celui du bas (diastolique) à la pression entre deux battements.

Une mesure autour de 12/8 (120/80 mmHg) est généralement considérée comme saine. Au-dessus de 14/9 (140/90 mmHg) de façon répétée, on parle d'hypertension : c'est le moment d'en discuter avec votre médecin.

De petites habitudes quotidiennes font une vraie différence : réduire le sel ajouté, bouger 30 minutes presque tous les jours, limiter l'alcool, bien dormir et gérer le stress. Si vous mesurez à la maison, faites-le à la même heure, assis et au repos.$txt$
WHERE title = 'Understanding your blood pressure numbers' AND body_fr IS NULL;

UPDATE articles SET
  title_fr   = $txt$Quand garder un enfant à la maison plutôt qu'à l'école ?$txt$,
  excerpt_fr = $txt$Un guide pratique pour les parents : fièvre, toux, et quand le repos à la maison est la bonne décision.$txt$,
  body_fr    = $txt$Décider d'envoyer ou non son enfant à l'école n'est pas toujours simple. En règle générale, gardez-le à la maison s'il a plus de 38°C de fièvre, s'il est trop fatigué pour participer, ou si ses symptômes sont contagieux.

Un simple nez qui coule sans fièvre ne pose généralement pas de problème. En revanche, vomissements, diarrhée ou éruption cutanée inexpliquée méritent une journée de repos et un examen plus attentif.

Le retour à l'école se fait une fois que l'enfant est resté 24 heures sans fièvre, sans médicament, et qu'il a retrouvé l'énergie de participer. En cas de doute, une consultation rapide peut éviter une maladie plus longue.$txt$
WHERE title = 'When should you keep a child home from school?' AND body_fr IS NULL;

UPDATE articles SET
  title_fr   = $txt$Une routine simple pour une peau saine$txt$,
  excerpt_fr = $txt$Pas besoin de dix produits : trois gestes réguliers protègent et nourrissent la plupart des types de peau.$txt$,
  body_fr    = $txt$Prendre soin de sa peau est une question de régularité, pas de complexité. Pour la plupart des gens, trois gestes suffisent : un nettoyant doux matin et soir, une crème hydratante adaptée à votre type de peau, et — surtout — un écran solaire SPF 30+ à large spectre chaque matin.

L'écran solaire est le geste anti-âge et anti-cancer de la peau le plus efficace qui existe. Renouvelez l'application si vous restez longtemps dehors.

Introduisez les actifs comme le rétinol progressivement, et testez tout nouveau produit sur une petite zone. En cas d'acné persistante, de rougeurs ou d'un grain de beauté qui change, consultez plutôt que de vous soigner seul.$txt$
WHERE title = 'A simple daily routine for healthy skin' AND body_fr IS NULL;

UPDATE articles SET
  title_fr   = $txt$Bulletin grippe saisonnière : ce que nous observons ce mois-ci$txt$,
  excerpt_fr = $txt$Un point public sur les infections respiratoires en circulation et sur les personnes qui devraient se faire vacciner.$txt$,
  body_fr    = $txt$Ces dernières semaines, nous observons une hausse régulière des infections respiratoires saisonnières, le plus souvent bénignes. Les symptômes typiques : fièvre, courbatures, mal de gorge et toux sèche pendant plusieurs jours.

La plupart des patients guérissent à la maison avec du repos et une bonne hydratation. Consultez si vous ressentez un essoufflement, une fièvre qui ne cède pas, ou si les symptômes s'aggravent après une première amélioration.

La vaccination reste la meilleure protection, en particulier pour les plus de 65 ans, les femmes enceintes et les personnes atteintes de maladies chroniques. Les gestes simples — lavage des mains, rester chez soi quand on est malade, aérer les pièces — réduisent nettement la transmission.$txt$
WHERE title = 'Seasonal flu report: what we are seeing this month' AND body_fr IS NULL;

UPDATE articles SET
  title_fr   = $txt$Les petits gestes qui protègent votre santé mentale$txt$,
  excerpt_fr = $txt$Partageons les habitudes quotidiennes qui aident nos patients à garder l'équilibre. En voici quelques-unes que je recommande.$txt$,
  body_fr    = $txt$La santé mentale se construit par petites habitudes répétées. Celles qui aident vraiment, d'après mon expérience : garder des horaires de sommeil réguliers, s'exposer à la lumière du jour tôt dans la journée, bouger, et rester en lien avec les personnes qui comptent.

Limiter le défilement des écrans avant de dormir et se fixer des objectifs quotidiens réalistes réduit aussi l'anxiété chez beaucoup de patients.

J'aimerais entendre mes confrères et consœurs : quels conseils simples et concrets donnez-vous à vos patients, et qui fonctionnent vraiment ? Construisons une liste commune ci-dessous.$txt$
WHERE title = 'Small steps that protect your mental health' AND body_fr IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 3a. New advice articles (1-6 of 12)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO articles (author_id, title, title_fr, category, excerpt, excerpt_fr, body, body_fr, cover_image, created_at)
SELECT v.author_id::uuid, v.title, v.title_fr, v.category, v.excerpt, v.excerpt_fr, v.body, v.body_fr, v.cover_image, v.created_at
FROM (VALUES
  (
    'd0000000-0000-4000-a000-000000000010',
    $txt$Staying hydrated through the Tunisian summer$txt$,
    $txt$Bien s'hydrater pendant l'été tunisien$txt$,
    'advice',
    $txt$Heat above 35°C is routine here in summer. How much water you really need, and the warning signs of dehydration.$txt$,
    $txt$Des chaleurs au-delà de 35°C sont la norme ici en été. La quantité d'eau qu'il vous faut vraiment, et les signes d'alerte de la déshydratation.$txt$,
    $txt$In a Tunisian summer, an adult needs roughly 1.5 to 2.5 litres of water a day — more if you work outdoors or exercise. Do not wait to feel thirsty: thirst already means you are mildly dehydrated. Keep a bottle within reach and drink small amounts regularly.

Watch for the warning signs of dehydration: dark urine, headache, dizziness when standing up, unusual fatigue, and dry lips. In children and the elderly these signs appear faster and matter more.

Coffee and sugary sodas do not replace water. Soups, fruit like watermelon, and vegetables all count towards your intake. If someone becomes confused, stops sweating in the heat, or cannot keep fluids down, seek medical care the same day.$txt$,
    $txt$Pendant l'été tunisien, un adulte a besoin d'environ 1,5 à 2,5 litres d'eau par jour — davantage si vous travaillez dehors ou faites du sport. N'attendez pas d'avoir soif : la soif signifie déjà une déshydratation légère. Gardez une bouteille à portée de main et buvez régulièrement par petites quantités.

Surveillez les signes d'alerte : urines foncées, maux de tête, vertiges en se levant, fatigue inhabituelle, lèvres sèches. Chez les enfants et les personnes âgées, ces signes apparaissent plus vite et sont plus sérieux.

Le café et les sodas sucrés ne remplacent pas l'eau. Les soupes, les fruits comme la pastèque et les légumes comptent dans vos apports. Si une personne devient confuse, cesse de transpirer malgré la chaleur ou ne garde aucun liquide, consultez le jour même.$txt$,
    '/articles/hydration.jpg',
    NOW() - INTERVAL '8 days 3 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000013',
    $txt$Eating well with type 2 diabetes$txt$,
    $txt$Bien manger avec un diabète de type 2$txt$,
    'advice',
    $txt$No forbidden-food lists — a realistic way to build meals that keep your blood sugar stable.$txt$,
    $txt$Pas de liste d'aliments interdits — une méthode réaliste pour composer des repas qui stabilisent la glycémie.$txt$,
    $txt$Managing type 2 diabetes starts on your plate, but it does not mean giving up everything you love. Build each meal around the plate method: half non-starchy vegetables, a quarter lean protein (fish, chicken, legumes), and a quarter whole grains like barley or whole-wheat couscous.

Timing matters as much as content. Eat at regular hours, never skip meals to "save" carbohydrates, and avoid sugary drinks — they raise blood sugar faster than almost any food. Fresh fruit is fine in moderate portions; fruit juice is not the same thing.

Aim for 30 minutes of walking most days: muscles in motion absorb glucose without needing extra insulin. And check your HbA1c as your doctor advises — it tells us how the whole strategy is working over three months, not just one morning.$txt$,
    $txt$La prise en charge du diabète de type 2 commence dans l'assiette, mais elle n'oblige pas à renoncer à tout ce qu'on aime. Composez chaque repas selon la méthode de l'assiette : une moitié de légumes, un quart de protéines maigres (poisson, poulet, légumineuses) et un quart de céréales complètes comme l'orge ou le couscous complet.

Le rythme compte autant que le contenu. Mangez à heures régulières, ne sautez jamais de repas pour « économiser » des glucides, et évitez les boissons sucrées — elles font monter la glycémie plus vite que presque n'importe quel aliment. Les fruits frais en portions modérées, oui ; les jus de fruits, ce n'est pas pareil.

Visez 30 minutes de marche presque tous les jours : un muscle en mouvement absorbe le glucose sans insuline supplémentaire. Et contrôlez votre HbA1c selon les conseils de votre médecin — elle reflète l'équilibre des trois derniers mois, pas seulement celui d'un matin.$txt$,
    '/articles/nutrition.jpg',
    NOW() - INTERVAL '12 days 5 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000012',
    $txt$Better sleep, step by step$txt$,
    $txt$Mieux dormir, étape par étape$txt$,
    'advice',
    $txt$A psychiatrist's practical checklist for falling asleep faster and waking up genuinely rested.$txt$,
    $txt$La check-list pratique d'un psychiatre pour s'endormir plus vite et se réveiller vraiment reposé.$txt$,
    $txt$Good sleep is a habit your brain learns. The foundation is a fixed wake-up time — even on weekends. Your bedtime will naturally adjust within two to three weeks.

In the evening, dim the lights and put screens away at least 45 minutes before bed; blue light delays melatonin, the hormone that makes you sleepy. Keep the bedroom cool, dark and quiet, and reserve the bed for sleep — not for scrolling, eating or working.

If you cannot fall asleep after about 20 minutes, get up, read something calm in low light, and return to bed when drowsy. Avoid caffeine after 2 pm and heavy meals late at night. If insomnia persists more than a month despite all this, or if you snore loudly and wake up exhausted, talk to a doctor — some sleep problems need specific treatment.$txt$,
    $txt$Le bon sommeil est une habitude que le cerveau apprend. La base : une heure de réveil fixe, même le week-end. L'heure d'endormissement s'ajustera naturellement en deux à trois semaines.

Le soir, baissez la lumière et rangez les écrans au moins 45 minutes avant le coucher ; la lumière bleue retarde la mélatonine, l'hormone qui donne sommeil. Gardez la chambre fraîche, sombre et calme, et réservez le lit au sommeil — pas au scrolling, aux repas ni au travail.

Si vous ne dormez pas après 20 minutes, levez-vous, lisez quelque chose de calme en lumière douce, et recouchez-vous quand la somnolence revient. Évitez la caféine après 14 h et les repas lourds tard le soir. Si l'insomnie persiste plus d'un mois malgré tout, ou si vous ronflez fort et vous réveillez épuisé, parlez-en à un médecin — certains troubles du sommeil demandent un traitement spécifique.$txt$,
    '/articles/sleep.jpg',
    NOW() - INTERVAL '15 days 7 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000017',
    $txt$Protecting your back when you sit all day$txt$,
    $txt$Protéger son dos quand on est assis toute la journée$txt$,
    'advice',
    $txt$Desk jobs are hard on the spine. Small changes to your chair, screen and habits prevent most back pain.$txt$,
    $txt$Le travail de bureau met la colonne à rude épreuve. Quelques réglages de chaise, d'écran et d'habitudes évitent la plupart des douleurs.$txt$,
    $txt$Most office back pain does not come from one bad movement but from hours of the same position. Set your screen at eye level, keep both feet flat on the floor, and let the chair support your lower back — a small cushion works if the chair does not.

The best posture is the next posture: stand up every 30 to 45 minutes, even for one minute. Walk during phone calls. Two or three times a day, do simple extensions — stand, hands on hips, and gently arch backwards five times.

Strengthening matters more than any gadget: core and back muscles are your natural corset. Walking, swimming and gentle stretching are excellent. See a doctor if pain shoots down a leg, wakes you at night, or comes with numbness — those signs deserve an examination, not just a new chair.$txt$,
    $txt$La plupart des douleurs de dos au bureau ne viennent pas d'un faux mouvement, mais d'heures passées dans la même position. Placez l'écran à hauteur des yeux, gardez les deux pieds à plat au sol, et faites soutenir le bas du dos par le dossier — un petit coussin fait l'affaire si la chaise ne le fait pas.

La meilleure posture, c'est la suivante : levez-vous toutes les 30 à 45 minutes, même une minute. Marchez pendant vos appels. Deux à trois fois par jour, faites des extensions simples — debout, mains sur les hanches, cambrez doucement vers l'arrière cinq fois.

Le renforcement compte plus que n'importe quel gadget : les muscles du tronc sont votre corset naturel. Marche, natation et étirements doux sont excellents. Consultez si la douleur descend dans une jambe, vous réveille la nuit ou s'accompagne d'engourdissements — ces signes méritent un examen, pas seulement une nouvelle chaise.$txt$,
    '/articles/back.jpg',
    NOW() - INTERVAL '18 days 2 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000020',
    $txt$Your child's vaccination schedule, explained simply$txt$,
    $txt$Le calendrier vaccinal de votre enfant, expliqué simplement$txt$,
    'advice',
    $txt$Which vaccines happen when, why boosters matter, and what to do about mild reactions after the injection.$txt$,
    $txt$Quels vaccins à quel âge, pourquoi les rappels sont importants, et que faire en cas de petite réaction après l'injection.$txt$,
    $txt$Vaccines are given on a schedule for a reason: each dose arrives when your child's immune system responds best and when protection is needed most. The first months cover the essentials — BCG, hepatitis B, then the combined vaccines against diphtheria, tetanus, pertussis and polio, with doses around 2, 3 and 6 months.

Measles-containing vaccine follows around 11 to 12 months with a second dose later. Boosters through childhood are not "extras": immunity fades, and the booster restores full protection.

After an injection, a sore arm, mild fever or a grumpy day are normal and pass within 48 hours; paracetamol at the right dose for weight can help. Keep the vaccination booklet up to date and bring it to every visit. If your child missed doses, do not restart from zero — we simply catch up from where you stopped.$txt$,
    $txt$Les vaccins suivent un calendrier précis pour une bonne raison : chaque dose arrive au moment où le système immunitaire de l'enfant répond le mieux et où la protection est la plus nécessaire. Les premiers mois couvrent l'essentiel — BCG, hépatite B, puis les vaccins combinés contre la diphtérie, le tétanos, la coqueluche et la polio, avec des doses vers 2, 3 et 6 mois.

Le vaccin contre la rougeole arrive vers 11-12 mois, avec une seconde dose plus tard. Les rappels de l'enfance ne sont pas des « bonus » : l'immunité s'estompe, et le rappel restaure une protection complète.

Après une injection, un bras sensible, une petite fièvre ou une journée grognon sont normaux et passent en 48 heures ; le paracétamol à la bonne dose pour le poids peut aider. Gardez le carnet de vaccination à jour et apportez-le à chaque visite. En cas de doses manquées, on ne recommence pas à zéro — on rattrape simplement là où vous vous êtes arrêtés.$txt$,
    '/articles/vaccine.jpg',
    NOW() - INTERVAL '21 days 6 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000007',
    $txt$Two minutes, twice a day: brushing that really protects your teeth$txt$,
    $txt$Deux minutes, deux fois par jour : un brossage qui protège vraiment vos dents$txt$,
    'advice',
    $txt$Most people brush too fast and too hard. The technique that actually prevents cavities and gum disease.$txt$,
    $txt$La plupart des gens se brossent les dents trop vite et trop fort. La technique qui prévient vraiment caries et problèmes de gencives.$txt$,
    $txt$The two rules that matter most: brush for a full two minutes, twice a day, and use a fluoride toothpaste. Fluoride hardens enamel and is the single most proven anti-cavity ingredient we have.

Technique beats force. Hold the brush at 45 degrees towards the gum line and make small, gentle circular movements — scrubbing hard wears down enamel and pushes gums back. A soft-bristled brush is enough; replace it every three months. At night, brush last thing and do not rinse with water afterwards: spit, and let the fluoride keep working.

Clean between teeth once a day with floss or interdental brushes — that is where most cavities between adults' teeth start. Bleeding gums are not normal: they usually signal plaque build-up, and a check-up plus professional cleaning solves it early. See your dentist once a year even without pain.$txt$,
    $txt$Les deux règles qui comptent le plus : se brosser les dents pendant deux vraies minutes, deux fois par jour, avec un dentifrice au fluor. Le fluor durcit l'émail et reste l'ingrédient anti-caries le plus prouvé qui existe.

La technique vaut mieux que la force. Tenez la brosse à 45 degrés vers la gencive et faites de petits mouvements circulaires doux — frotter fort use l'émail et fait reculer les gencives. Une brosse souple suffit ; changez-la tous les trois mois. Le soir, brossez-vous en dernier et ne rincez pas à l'eau après : recrachez, et laissez le fluor agir.

Nettoyez entre les dents une fois par jour avec du fil dentaire ou des brossettes — c'est là que naissent la plupart des caries chez l'adulte. Des gencives qui saignent ne sont pas normales : c'est en général un signe de plaque, et un détartrage règle le problème tôt. Voyez votre dentiste une fois par an, même sans douleur.$txt$,
    '/articles/dental.jpg',
    NOW() - INTERVAL '25 days 4 hours'
  )
) AS v(author_id, title, title_fr, category, excerpt, excerpt_fr, body, body_fr, cover_image, created_at)
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE title = 'Staying hydrated through the Tunisian summer');

-- ─────────────────────────────────────────────────────────────────────
-- 3b. New advice articles (7-12 of 12)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO articles (author_id, title, title_fr, category, excerpt, excerpt_fr, body, body_fr, cover_image, created_at)
SELECT v.author_id::uuid, v.title, v.title_fr, v.category, v.excerpt, v.excerpt_fr, v.body, v.body_fr, v.cover_image, v.created_at
FROM (VALUES
  (
    'd0000000-0000-4000-a000-000000000006',
    $txt$Screens and tired eyes: the 20-20-20 rule$txt$,
    $txt$Écrans et yeux fatigués : la règle du 20-20-20$txt$,
    'advice',
    $txt$Burning, dry or blurry eyes at the end of the day? Digital eye strain is common — and very manageable.$txt$,
    $txt$Yeux qui piquent, secs ou vision floue en fin de journée ? La fatigue visuelle numérique est fréquente — et très gérable.$txt$,
    $txt$Hours in front of a screen make your eyes work overtime, and you blink up to half as often without noticing. The result: dryness, burning, blurry vision and end-of-day headaches. This is digital eye strain, and it is rarely dangerous — but it is worth treating.

The simplest fix is the 20-20-20 rule: every 20 minutes, look at something about 20 feet away (6 metres) for at least 20 seconds. It relaxes the focusing muscle and lets your blink rate recover. Position the screen slightly below eye level, about an arm's length away, and avoid glare from windows behind you.

Artificial tears help if dryness persists. If you have frequent headaches, double vision, or find yourself squinting to read, book an eye exam: uncorrected vision problems are often the real culprit — especially in teenagers who spend long hours on phones.$txt$,
    $txt$Des heures devant un écran font travailler les yeux en continu, et l'on cligne jusqu'à deux fois moins sans s'en rendre compte. Résultat : sécheresse, picotements, vision floue et maux de tête en fin de journée. C'est la fatigue visuelle numérique — rarement grave, mais à prendre au sérieux.

Le remède le plus simple est la règle du 20-20-20 : toutes les 20 minutes, regardez quelque chose à environ 6 mètres pendant au moins 20 secondes. Cela détend le muscle de la mise au point et laisse le clignement se rétablir. Placez l'écran légèrement sous le niveau des yeux, à une longueur de bras, et évitez les reflets d'une fenêtre derrière vous.

Les larmes artificielles aident si la sécheresse persiste. En cas de maux de tête fréquents, de vision double ou si vous plissez les yeux pour lire, prenez rendez-vous pour un examen de la vue : un défaut de correction est souvent le vrai coupable — surtout chez les adolescents qui passent de longues heures sur leur téléphone.$txt$,
    '/articles/eyes.jpg',
    NOW() - INTERVAL '28 days 5 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000005',
    $txt$Getting back to sport safely after a long break$txt$,
    $txt$Reprendre le sport en toute sécurité après une longue pause$txt$,
    'advice',
    $txt$Motivation is high, but tendons need time. How to restart training without ending up in my consultation room.$txt$,
    $txt$La motivation est là, mais les tendons ont besoin de temps. Comment reprendre l'entraînement sans finir dans mon cabinet.$txt$,
    $txt$Most sports injuries I see in clinic follow the same story: months of inactivity, then a sudden return at the old intensity. Muscles adapt in weeks; tendons and joints need months. That mismatch is where tears and tendinitis happen.

Restart at roughly half of what you used to do, and increase total load by no more than about 10% per week. Warm up for 10 minutes before, and schedule at least one full rest day between intense sessions in the first month. Soreness that fades in 48 hours is normal adaptation; sharp pain during movement is a stop signal.

Strength work protects you: two short sessions a week of basic strengthening prevent the majority of running and football injuries. Over 40, or with a heart condition in the family, a quick medical check before resuming intense sport is a good investment — it takes one visit and rules out the rare but serious risks.$txt$,
    $txt$La plupart des blessures sportives que je vois en consultation racontent la même histoire : des mois d'inactivité, puis une reprise brutale à l'ancienne intensité. Les muscles s'adaptent en quelques semaines ; les tendons et les articulations demandent des mois. C'est dans ce décalage que naissent déchirures et tendinites.

Reprenez à environ la moitié de ce que vous faisiez, et augmentez la charge totale d'au plus 10 % par semaine. Échauffez-vous 10 minutes, et gardez au moins un jour de repos complet entre les séances intenses le premier mois. Des courbatures qui s'estompent en 48 heures, c'est une adaptation normale ; une douleur vive pendant le mouvement, c'est un signal d'arrêt.

Le renforcement musculaire vous protège : deux courtes séances par semaine préviennent la majorité des blessures de course et de football. Après 40 ans, ou si des maladies cardiaques existent dans la famille, un contrôle médical rapide avant de reprendre un sport intense est un bon investissement — une seule visite écarte les risques rares mais sérieux.$txt$,
    '/articles/sport.jpg',
    NOW() - INTERVAL '32 days 3 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000011',
    $txt$The first trimester: a simple guide for a healthy start$txt$,
    $txt$Le premier trimestre : un guide simple pour bien commencer$txt$,
    'advice',
    $txt$Folic acid, the first ultrasound, food safety and fatigue — what actually matters in early pregnancy.$txt$,
    $txt$Acide folique, première échographie, alimentation et fatigue — ce qui compte vraiment en début de grossesse.$txt$,
    $txt$The first twelve weeks shape the whole pregnancy, and a few simple actions cover most of what matters. Start folic acid (vitamin B9) as soon as pregnancy is confirmed — ideally before conception — 0.4 mg daily; it dramatically reduces the risk of neural tube defects.

Book the first consultation before week 10 to confirm dates, review your medications, and plan the first-trimester ultrasound around weeks 11 to 13. Avoid alcohol and tobacco completely, limit coffee to about two cups a day, and skip raw meat, unpasteurised cheese and unwashed raw vegetables if you are not immune to toxoplasmosis.

Fatigue and nausea are common and usually peak around week 9 before improving. Eat small, frequent meals and rest without guilt. Call your doctor without waiting for significant bleeding, severe abdominal pain, or vomiting that prevents you from keeping any food down — those need a same-day check.$txt$,
    $txt$Les douze premières semaines conditionnent toute la grossesse, et quelques gestes simples couvrent l'essentiel. Commencez l'acide folique (vitamine B9) dès la confirmation de la grossesse — idéalement avant la conception — à 0,4 mg par jour ; il réduit considérablement le risque d'anomalies du tube neural.

Prenez le premier rendez-vous avant la 10e semaine pour confirmer le terme, passer en revue vos médicaments et planifier l'échographie du premier trimestre entre les semaines 11 et 13. Évitez totalement l'alcool et le tabac, limitez le café à environ deux tasses par jour, et écartez viande crue, fromages non pasteurisés et crudités mal lavées si vous n'êtes pas immunisée contre la toxoplasmose.

La fatigue et les nausées sont fréquentes et culminent en général vers la 9e semaine avant de s'améliorer. Fractionnez les repas et reposez-vous sans culpabiliser. Appelez votre médecin sans attendre en cas de saignements importants, de douleurs abdominales fortes ou de vomissements qui empêchent de garder tout aliment — cela mérite un contrôle le jour même.$txt$,
    '/articles/pregnancy.jpg',
    NOW() - INTERVAL '36 days 6 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000001',
    $txt$Preventing falls at home for your elderly parents$txt$,
    $txt$Prévenir les chutes à domicile chez vos parents âgés$txt$,
    'advice',
    $txt$One fall changes everything after 70. A room-by-room checklist that takes an afternoon and prevents years of trouble.$txt$,
    $txt$Après 70 ans, une chute change tout. Une check-list pièce par pièce qui prend un après-midi et évite des années de complications.$txt$,
    $txt$After 70, one fall in three leads to a lasting loss of confidence or mobility — and most falls happen at home, in places we can fix in an afternoon. Start with the floor: remove loose rugs or fix them with anti-slip pads, clear cables from walking paths, and keep corridors lit at night with simple plug-in nightlights.

In the bathroom, a grab bar in the shower and a non-slip mat are the two highest-value changes. In the bedroom, a lamp within reach of the bed avoids walking in the dark. Stairs need a solid handrail and good lighting top and bottom.

Then look beyond the house: have their vision checked yearly, review medications with the doctor — several common drugs cause dizziness, especially blood pressure treatments taken in the wrong dose — and encourage gentle strength and balance activity like daily walks. If a parent has already fallen once, mention it at the next consultation even if nothing was broken: it is the strongest predictor of the next fall, and we can act on it.$txt$,
    $txt$Après 70 ans, une chute sur trois entraîne une perte durable de confiance ou de mobilité — et la plupart des chutes ont lieu à la maison, dans des endroits qu'on peut sécuriser en un après-midi. Commencez par le sol : retirez les tapis qui glissent ou fixez-les avec des patins antidérapants, dégagez les câbles des zones de passage, et éclairez les couloirs la nuit avec de simples veilleuses.

Dans la salle de bain, une barre d'appui dans la douche et un tapis antidérapant sont les deux gestes les plus rentables. Dans la chambre, une lampe à portée du lit évite de marcher dans le noir. Les escaliers demandent une rampe solide et un bon éclairage en haut comme en bas.

Regardez ensuite au-delà de la maison : faites contrôler la vue chaque année, passez les médicaments en revue avec le médecin — plusieurs traitements courants donnent des vertiges, notamment les antihypertenseurs mal dosés — et encouragez une activité douce de force et d'équilibre comme la marche quotidienne. Si un parent est déjà tombé une fois, signalez-le à la prochaine consultation même sans fracture : c'est le meilleur prédicteur de la chute suivante, et on peut agir.$txt$,
    '/articles/care.jpg',
    NOW() - INTERVAL '40 days 2 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000019',
    $txt$Sunscreen is not just for the beach$txt$,
    $txt$La crème solaire, ce n'est pas que pour la plage$txt$,
    'advice',
    $txt$With our sunshine, daily UV protection is a medical habit, not a cosmetic one. How to choose and use it properly.$txt$,
    $txt$Avec notre ensoleillement, la protection UV quotidienne est une habitude médicale, pas cosmétique. Comment la choisir et bien l'utiliser.$txt$,
    $txt$Tunisia enjoys over 3,000 hours of sunshine a year — wonderful for life, demanding for skin. UV exposure accumulates silently: it is the main driver of skin ageing and of most skin cancers, and it works through car windows and light cloud cover too.

Choose a broad-spectrum sunscreen, SPF 30 minimum (SPF 50 for fair skin), and apply it every morning on face, neck and hands — the zones exposed daily. The quantity matters: most people apply half of what is needed. For the face alone, think two full finger-lengths of cream. Reapply every two hours during real sun exposure.

No sunscreen makes tanning "safe": shade between 11 am and 4 pm, a hat and sunglasses remain the core protection. And check your skin: a mole that changes size, shape or colour, or a small wound that does not heal within a month, deserves a dermatology visit without delay. Caught early, skin cancer is one of the most curable there is.$txt$,
    $txt$La Tunisie compte plus de 3 000 heures de soleil par an — un bonheur pour la vie, une épreuve pour la peau. L'exposition aux UV s'accumule en silence : c'est le premier facteur de vieillissement cutané et de la plupart des cancers de la peau, et elle agit aussi à travers les vitres de voiture et les nuages légers.

Choisissez une crème à large spectre, SPF 30 minimum (SPF 50 pour les peaux claires), et appliquez-la chaque matin sur le visage, le cou et les mains — les zones exposées au quotidien. La quantité compte : la plupart des gens en mettent moitié moins qu'il ne faut. Pour le visage seul, comptez l'équivalent de deux doigts de crème. Renouvelez toutes les deux heures en cas d'exposition réelle.

Aucune crème ne rend le bronzage « sûr » : l'ombre entre 11 h et 16 h, un chapeau et des lunettes restent la protection de base. Et surveillez votre peau : un grain de beauté qui change de taille, de forme ou de couleur, ou une petite plaie qui ne cicatrise pas en un mois, mérite une consultation dermatologique sans tarder. Détecté tôt, le cancer de la peau est l'un des plus guérissables qui soient.$txt$,
    '/articles/skincare.jpg',
    NOW() - INTERVAL '44 days 4 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000018',
    $txt$Cholesterol: reading your test results without panic$txt$,
    $txt$Cholestérol : lire ses analyses sans paniquer$txt$,
    'advice',
    $txt$LDL, HDL, triglycerides — what each number means, and which ones actually drive your cardiovascular risk.$txt$,
    $txt$LDL, HDL, triglycérides — ce que signifie chaque chiffre, et lesquels pèsent vraiment sur votre risque cardiovasculaire.$txt$,
    $txt$A lipid panel has several numbers, and they do not all matter equally. LDL is the "bad" cholesterol that deposits in artery walls — for most people it should stay below 1.6 g/L, and lower still if you have diabetes, hypertension or a history of heart disease. HDL is the "good" one that clears cholesterol away: above 0.4 g/L is what we want. Triglycerides mostly reflect diet, alcohol and weight, ideally below 1.5 g/L.

One number alone rarely tells the story: we interpret it against your overall risk — age, blood pressure, smoking, diabetes, family history. That is why two people with the same LDL can receive different advice.

The levers, in order of impact: stop smoking, move 30 minutes a day, favour olive oil, fish, vegetables and legumes over fried food and processed meats, and lose weight if needed. When medication is justified, statins are among the best-studied drugs in medicine. Recheck three months after any change — not the week after.$txt$,
    $txt$Un bilan lipidique comporte plusieurs chiffres, et ils ne pèsent pas tous pareil. Le LDL est le « mauvais » cholestérol qui se dépose dans les artères — pour la plupart des gens il doit rester sous 1,6 g/L, et plus bas encore en cas de diabète, d'hypertension ou d'antécédents cardiaques. Le HDL est le « bon », celui qui nettoie : au-dessus de 0,4 g/L, c'est ce qu'on veut. Les triglycérides reflètent surtout l'alimentation, l'alcool et le poids, idéalement sous 1,5 g/L.

Un chiffre isolé dit rarement tout : on l'interprète selon votre risque global — âge, tension, tabac, diabète, antécédents familiaux. C'est pourquoi deux personnes avec le même LDL peuvent recevoir des conseils différents.

Les leviers, par ordre d'impact : arrêter le tabac, bouger 30 minutes par jour, privilégier huile d'olive, poisson, légumes et légumineuses plutôt que fritures et charcuteries, et perdre du poids si besoin. Quand un traitement se justifie, les statines comptent parmi les médicaments les mieux étudiés de la médecine. Recontrôlez trois mois après tout changement — pas la semaine suivante.$txt$,
    '/articles/cardio.jpg',
    NOW() - INTERVAL '48 days 5 hours'
  )
) AS v(author_id, title, title_fr, category, excerpt, excerpt_fr, body, body_fr, cover_image, created_at)
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE title = 'Screens and tired eyes: the 20-20-20 rule');

-- ─────────────────────────────────────────────────────────────────────
-- 3c. New public reports (13-17 of 22)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO articles (author_id, title, title_fr, category, excerpt, excerpt_fr, body, body_fr, cover_image, created_at)
SELECT v.author_id::uuid, v.title, v.title_fr, v.category, v.excerpt, v.excerpt_fr, v.body, v.body_fr, v.cover_image, v.created_at
FROM (VALUES
  (
    'd0000000-0000-4000-a000-000000000008',
    $txt$Pollen season report: allergies are peaking across the north$txt$,
    $txt$Bulletin pollens : les allergies au plus haut dans le nord$txt$,
    'report',
    $txt$Olive and grass pollen are at their seasonal peak. What allergic patients can do now, and when to consult.$txt$,
    $txt$Les pollens d'olivier et de graminées atteignent leur pic saisonnier. Ce que les patients allergiques peuvent faire, et quand consulter.$txt$,
    $txt$Consultations for allergic rhinitis have roughly doubled in our clinic over the past three weeks. Olive tree and grass pollens are at their seasonal peak across the northern governorates, and windy days spread them far beyond green areas. Typical picture: sneezing fits, runny or blocked nose, itchy eyes — but no fever. Fever points to an infection, not an allergy.

Practical measures that genuinely help: keep windows closed in the late morning when pollen counts are highest, rinse your nose with saline after coming home, shower before bed to remove pollen from hair, and dry laundry indoors on peak days.

Second-generation antihistamines relieve most patients without drowsiness. If symptoms persist despite treatment, if your sleep suffers, or if you notice wheezing or shortness of breath, book a consultation: uncontrolled rhinitis often hides or aggravates asthma, and effective long-term options exist, including desensitisation.$txt$,
    $txt$Les consultations pour rhinite allergique ont environ doublé dans notre cabinet ces trois dernières semaines. Les pollens d'olivier et de graminées sont à leur pic saisonnier dans les gouvernorats du nord, et les journées venteuses les transportent bien au-delà des zones vertes. Tableau typique : salves d'éternuements, nez qui coule ou bouché, yeux qui grattent — mais pas de fièvre. La fièvre évoque une infection, pas une allergie.

Les mesures qui aident vraiment : fermer les fenêtres en fin de matinée quand les pollens sont au plus haut, se rincer le nez au sérum physiologique en rentrant, se doucher avant le coucher pour éliminer le pollen des cheveux, et faire sécher le linge à l'intérieur les jours de pic.

Les antihistaminiques de deuxième génération soulagent la plupart des patients sans somnolence. Si les symptômes persistent malgré le traitement, si votre sommeil en souffre, ou si vous remarquez des sifflements ou un essoufflement, consultez : une rhinite non contrôlée cache ou aggrave souvent un asthme, et des solutions durables existent, y compris la désensibilisation.$txt$,
    '/articles/allergy.jpg',
    NOW() - INTERVAL '5 days 4 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000015',
    $txt$Summer gastroenteritis: cases are rising, hygiene matters$txt$,
    $txt$Gastro-entérites d'été : les cas augmentent, l'hygiène est décisive$txt$,
    'report',
    $txt$Heat accelerates food contamination. Our seasonal update, rehydration guidance, and the red flags that need a doctor.$txt$,
    $txt$La chaleur accélère la contamination des aliments. Notre point saisonnier, les bons réflexes de réhydratation, et les signaux d'alarme.$txt$,
    $txt$Every summer brings its wave of gastroenteritis, and this year is no exception: cases in our practice have risen steadily for a month. Heat shortens the time food can safely sit out — a salad or dairy dessert left two hours in 35°C weather is enough for bacteria to multiply to risky levels.

Prevention is mostly kitchen discipline: wash hands with soap before handling food, keep raw meat separate from everything else, refrigerate leftovers within an hour in summer, and be careful with mayonnaise, cream and undercooked eggs at outdoor gatherings. When eating out, be wary of dishes kept lukewarm.

Most episodes resolve in two to three days: the treatment is rehydration — water, oral rehydration solutions for children — in small, frequent sips, plus rest. Consult the same day for a child under two, an elderly person, blood in stools, high fever, or signs of dehydration such as dark urine and dizziness. Antibiotics are rarely needed and never self-prescribed.$txt$,
    $txt$Chaque été apporte sa vague de gastro-entérites, et cette année ne fait pas exception : les cas augmentent régulièrement depuis un mois dans notre patientèle. La chaleur raccourcit le temps pendant lequel un aliment peut rester dehors sans danger — une salade ou un dessert lacté laissé deux heures par 35°C suffit pour que les bactéries atteignent des niveaux à risque.

La prévention est surtout une discipline de cuisine : se laver les mains au savon avant de cuisiner, séparer la viande crue du reste, réfrigérer les restes dans l'heure en été, et se méfier de la mayonnaise, de la crème et des œufs peu cuits lors des repas en plein air. Au restaurant, attention aux plats maintenus tièdes.

La plupart des épisodes guérissent en deux à trois jours : le traitement, c'est la réhydratation — eau, solutés de réhydratation orale pour les enfants — par petites gorgées fréquentes, plus du repos. Consultez le jour même pour un enfant de moins de deux ans, une personne âgée, du sang dans les selles, une fièvre élevée ou des signes de déshydratation comme des urines foncées et des vertiges. Les antibiotiques sont rarement nécessaires et jamais en automédication.$txt$,
    '/articles/hygiene.jpg',
    NOW() - INTERVAL '9 days 6 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000001',
    $txt$Heatwave report: dehydration and heat stroke on the rise$txt$,
    $txt$Bulletin canicule : déshydratation et coups de chaleur en hausse$txt$,
    'report',
    $txt$Temperatures above 40°C are sending more patients to consultations. Who is most at risk and how to recognise an emergency.$txt$,
    $txt$Des températures au-delà de 40°C amènent plus de patients en consultation. Qui est le plus à risque et comment reconnaître l'urgence.$txt$,
    $txt$With several days above 40°C, we are seeing a clear rise in heat-related consultations: dehydration, exhaustion, dizziness and fainting. The most affected are outdoor workers, the elderly living alone, infants, and patients on diuretics or blood pressure medication.

Heat exhaustion shows as heavy sweating, weakness, headache, nausea and cramps — it is treated by moving to a cool place, loosening clothes, and drinking water with a pinch of salt or an oral rehydration solution. Heat stroke is different and life-threatening: body temperature above 40°C, hot dry skin that has stopped sweating, confusion or loss of consciousness. That is an emergency — call for help immediately and cool the person actively while waiting.

Until the heat passes: avoid effort between 11 am and 5 pm, check on elderly neighbours and relatives daily, never leave a child in a parked car even briefly, and keep homes shaded during the day and ventilated at night.$txt$,
    $txt$Avec plusieurs journées au-dessus de 40°C, nous constatons une nette hausse des consultations liées à la chaleur : déshydratation, épuisement, vertiges et malaises. Les plus touchés : les travailleurs en extérieur, les personnes âgées vivant seules, les nourrissons, et les patients sous diurétiques ou traitements antihypertenseurs.

L'épuisement par la chaleur se manifeste par une transpiration abondante, une faiblesse, des maux de tête, des nausées et des crampes — il se traite en s'installant au frais, en desserrant les vêtements et en buvant de l'eau avec une pincée de sel ou un soluté de réhydratation. Le coup de chaleur est autre chose et met la vie en danger : température au-dessus de 40°C, peau chaude et sèche qui ne transpire plus, confusion ou perte de connaissance. C'est une urgence — appelez les secours immédiatement et refroidissez activement la personne en attendant.

Jusqu'à la fin de l'épisode : évitez les efforts entre 11 h et 17 h, prenez des nouvelles des voisins et proches âgés chaque jour, ne laissez jamais un enfant dans une voiture garée même brièvement, et gardez les logements à l'ombre le jour et aérés la nuit.$txt$,
    '/articles/hydration.jpg',
    NOW() - INTERVAL '13 days 3 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000004',
    $txt$Back-to-school health check: the infections we expect this term$txt$,
    $txt$Rentrée scolaire : les infections que nous attendons ce trimestre$txt$,
    'report',
    $txt$Classrooms mean shared microbes. What circulates in the first weeks of school and how families can limit the damage.$txt$,
    $txt$Qui dit classe dit microbes partagés. Ce qui circule dans les premières semaines d'école et comment les familles peuvent limiter les dégâts.$txt$,
    $txt$Every year, the first six weeks of school bring a predictable wave: colds, sore throats, conjunctivitis, stomach bugs and, a little later, the first bronchiolitis cases in younger siblings. A child in their first years of school catching six to eight colds between September and spring is normal, not a sign of weak immunity.

Families can blunt the wave with simple reflexes: teach hand-washing before meals and after school, teach coughing into the elbow, keep a child with fever or vomiting at home until recovered, and update vaccinations at the start of term — it is the ideal moment to check the booklet.

Antibiotics deserve a special word: most back-to-school infections are viral, and antibiotics do nothing against viruses. They are prescribed after examination when a bacterial infection is identified — never "just in case". Consult if a fever lasts more than three days, if breathing is fast or difficult, or if a child drinks and urinates much less than usual.$txt$,
    $txt$Chaque année, les six premières semaines d'école apportent une vague prévisible : rhumes, angines, conjonctivites, gastro-entérites et, un peu plus tard, les premières bronchiolites chez les petits frères et sœurs. Qu'un enfant dans ses premières années d'école attrape six à huit rhumes entre septembre et le printemps est normal — ce n'est pas le signe d'une immunité faible.

Les familles peuvent amortir la vague avec des réflexes simples : apprendre le lavage des mains avant les repas et au retour de l'école, apprendre à tousser dans le coude, garder à la maison un enfant fiévreux ou qui vomit jusqu'à la guérison, et mettre à jour les vaccins à la rentrée — c'est le moment idéal pour vérifier le carnet.

Un mot particulier sur les antibiotiques : la plupart des infections de la rentrée sont virales, et les antibiotiques n'ont aucun effet sur les virus. Ils se prescrivent après examen, quand une infection bactérienne est identifiée — jamais « au cas où ». Consultez si une fièvre dure plus de trois jours, si la respiration est rapide ou difficile, ou si un enfant boit et urine nettement moins que d'habitude.$txt$,
    '/articles/child.jpg',
    NOW() - INTERVAL '55 days 5 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000013',
    $txt$World Diabetes Day screening: what we found in our clinic$txt$,
    $txt$Journée mondiale du diabète : les résultats de notre dépistage$txt$,
    'report',
    $txt$We offered free glucose testing for a week. The numbers confirm why screening after 40 matters so much.$txt$,
    $txt$Nous avons proposé une glycémie gratuite pendant une semaine. Les chiffres confirment l'importance du dépistage après 40 ans.$txt$,
    $txt$For World Diabetes Day, our clinic offered free fasting glucose tests for one week. Out of 214 adults tested, 19 had values suggesting undiagnosed diabetes and 41 were in the prediabetes range — nearly three in ten participants, most of them without any symptom.

This mirrors what national studies suggest: a large share of type 2 diabetes goes undetected for years, quietly damaging vessels, kidneys and eyes. The disease is symptom-free at the stage where treatment works best — that is precisely why screening matters.

Our recommendation: after 40, check fasting glucose at least every three years; every year if you have a family history of diabetes, excess weight, hypertension, or had gestational diabetes. Prediabetes is not a sentence: losing 5 to 7% of body weight and walking 30 minutes a day halves the risk of progressing to diabetes. Everyone identified during the campaign has been offered follow-up — and our door remains open for anyone who missed it.$txt$,
    $txt$Pour la Journée mondiale du diabète, notre cabinet a proposé une glycémie à jeun gratuite pendant une semaine. Sur 214 adultes testés, 19 présentaient des valeurs évoquant un diabète non diagnostiqué et 41 étaient dans la zone du prédiabète — près de trois participants sur dix, la plupart sans aucun symptôme.

Cela rejoint ce que suggèrent les études nationales : une grande partie des diabètes de type 2 reste ignorée pendant des années, abîmant en silence les vaisseaux, les reins et les yeux. La maladie est asymptomatique au stade où le traitement marche le mieux — c'est exactement pourquoi le dépistage compte.

Notre recommandation : après 40 ans, contrôlez la glycémie à jeun au moins tous les trois ans ; chaque année en cas d'antécédents familiaux de diabète, de surpoids, d'hypertension ou de diabète gestationnel. Le prédiabète n'est pas une condamnation : perdre 5 à 7 % de son poids et marcher 30 minutes par jour divise par deux le risque d'évoluer vers un diabète. Toutes les personnes repérées pendant la campagne se sont vu proposer un suivi — et notre porte reste ouverte à ceux qui l'ont manquée.$txt$,
    '/articles/nutrition.jpg',
    NOW() - INTERVAL '60 days 2 hours'
  )
) AS v(author_id, title, title_fr, category, excerpt, excerpt_fr, body, body_fr, cover_image, created_at)
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE title = 'Pollen season report: allergies are peaking across the north');

-- ─────────────────────────────────────────────────────────────────────
-- 3d. New public reports (18-22 of 22)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO articles (author_id, title, title_fr, category, excerpt, excerpt_fr, body, body_fr, cover_image, created_at)
SELECT v.author_id::uuid, v.title, v.title_fr, v.category, v.excerpt, v.excerpt_fr, v.body, v.body_fr, v.cover_image, v.created_at
FROM (VALUES
  (
    'd0000000-0000-4000-a000-000000000002',
    $txt$Hypertension screening campaign: one in four did not know$txt$,
    $txt$Campagne de dépistage de l'hypertension : un sur quatre l'ignorait$txt$,
    'report',
    $txt$Results from our blood pressure screening days — and why the "silent killer" nickname is well earned.$txt$,
    $txt$Les résultats de nos journées de mesure de la tension — et pourquoi le surnom de « tueur silencieux » est mérité.$txt$,
    $txt$During our recent screening days, we measured blood pressure for 312 adults who came for other reasons or simply passed by. The headline finding: 78 people — one in four — had readings in the hypertensive range without knowing it. Another 54 knew but were not at target under their current treatment.

Hypertension earns its nickname of silent killer honestly: it causes no symptoms for years while it stiffens arteries and overworks the heart, then reveals itself through a stroke, a heart attack or kidney damage. A measurement takes thirty seconds; the damage it prevents takes years to build.

Our advice stands regardless of age: know your numbers. Have your blood pressure checked at least once a year after 40 — any consultation is a good occasion. If you measure at home, take readings seated, after five minutes of rest, morning and evening for three days, and bring the list to your doctor rather than reacting to a single high value. Treatment today is effective, well tolerated, and adjusted to each patient.$txt$,
    $txt$Lors de nos récentes journées de dépistage, nous avons mesuré la tension de 312 adultes venus pour d'autres motifs ou simplement de passage. Le résultat marquant : 78 personnes — une sur quatre — avaient des valeurs dans la zone de l'hypertension sans le savoir. 54 autres le savaient mais n'étaient pas à l'objectif sous leur traitement actuel.

L'hypertension mérite honnêtement son surnom de tueur silencieux : elle ne donne aucun symptôme pendant des années tandis qu'elle rigidifie les artères et surmène le cœur, puis se révèle par un AVC, un infarctus ou une atteinte rénale. La mesure prend trente secondes ; les dégâts qu'elle évite mettent des années à se construire.

Notre conseil vaut à tout âge : connaissez vos chiffres. Faites contrôler votre tension au moins une fois par an après 40 ans — toute consultation est une bonne occasion. Si vous mesurez à la maison : assis, après cinq minutes de repos, matin et soir pendant trois jours, et apportez la liste à votre médecin plutôt que de réagir à une seule valeur élevée. Les traitements actuels sont efficaces, bien tolérés et ajustés à chaque patient.$txt$,
    '/articles/cardio.jpg',
    NOW() - INTERVAL '65 days 4 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000007',
    $txt$Tooth decay in schoolchildren: a worrying trend$txt$,
    $txt$Caries chez les écoliers : une tendance préoccupante$txt$,
    'report',
    $txt$More than half of the children we examined this term had at least one untreated cavity. Sugary drinks are the main driver.$txt$,
    $txt$Plus de la moitié des enfants examinés ce trimestre avaient au moins une carie non soignée. Les boissons sucrées en sont le premier moteur.$txt$,
    $txt$Among the schoolchildren examined at our practice this term, more than half had at least one untreated cavity — a figure that has worsened over the past few years, in line with what colleagues report elsewhere. The pattern behind it is consistent: sugary drinks and snacking.

The mechanics are simple: every sugar intake feeds an acid attack on enamel for about twenty minutes. A soda sipped over an afternoon, or repeated sweet snacks, keep teeth under near-continuous attack. Fruit juices, often seen as healthy, are acidic and sugary too — water and milk are the only truly tooth-neutral drinks for daily use.

What protects children: fluoride toothpaste twice a day with an adult supervising brushing until age 7 or 8, sweets kept to mealtimes rather than spread across the day, water as the default drink, and a first dental visit by the first birthday, then yearly. Baby teeth matter — decayed ones hurt, get infected, and compromise the permanent teeth already forming underneath.$txt$,
    $txt$Parmi les écoliers examinés au cabinet ce trimestre, plus de la moitié présentaient au moins une carie non soignée — un chiffre qui se dégrade depuis quelques années, en accord avec ce que rapportent les confrères. Le schéma derrière est constant : boissons sucrées et grignotage.

Le mécanisme est simple : chaque prise de sucre déclenche une attaque acide de l'émail pendant environ vingt minutes. Un soda siroté tout un après-midi, ou des collations sucrées répétées, maintiennent les dents sous attaque quasi continue. Les jus de fruits, souvent perçus comme sains, sont eux aussi acides et sucrés — l'eau et le lait restent les seules boissons vraiment neutres pour les dents au quotidien.

Ce qui protège les enfants : un dentifrice fluoré deux fois par jour avec un adulte qui supervise le brossage jusqu'à 7-8 ans, les sucreries réservées aux repas plutôt qu'étalées sur la journée, l'eau comme boisson par défaut, et une première visite dentaire avant le premier anniversaire, puis chaque année. Les dents de lait comptent : cariées, elles font mal, s'infectent et compromettent les dents définitives qui se forment déjà dessous.$txt$,
    '/articles/dental.jpg',
    NOW() - INTERVAL '70 days 6 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000006',
    $txt$Myopia is rising in teenagers: results from our school screenings$txt$,
    $txt$La myopie progresse chez les adolescents : résultats de nos dépistages scolaires$txt$,
    'report',
    $txt$Screen time up, outdoor time down — and myopia follows. What our screening found and the habit that protects young eyes.$txt$,
    $txt$Plus d'écrans, moins de plein air — et la myopie suit. Ce que notre dépistage a révélé et l'habitude qui protège les jeunes yeux.$txt$,
    $txt$Our school vision screenings this year confirm a trend seen worldwide: myopia is appearing earlier and progressing faster. Around one in three teenagers screened needed a new or updated correction, and a striking number had never had an eye exam despite reading difficulties at the board.

The two identified drivers are prolonged near work — screens and books held close for hours — and insufficient daylight. Natural light appears to slow eye elongation, which is the mechanism of myopia. Children who spend under an hour a day outdoors are measurably more at risk.

The protective prescription is refreshingly low-tech: at least 90 minutes outdoors daily, the 20-20-20 rule during homework and screen time (every 20 minutes, look 6 metres away for 20 seconds), and reading distance kept at least 30 cm. Signs that warrant an eye exam without waiting for a school screening: squinting to see far, sitting ever closer to the TV, headaches after class, or falling grades that improve in the front row.$txt$,
    $txt$Nos dépistages visuels scolaires de cette année confirment une tendance mondiale : la myopie apparaît plus tôt et progresse plus vite. Environ un adolescent sur trois dépistés avait besoin d'une correction nouvelle ou mise à jour, et un nombre frappant n'avait jamais eu d'examen de la vue malgré des difficultés à lire au tableau.

Les deux moteurs identifiés : le travail prolongé de près — écrans et livres tenus près des yeux pendant des heures — et le manque de lumière du jour. La lumière naturelle semble freiner l'allongement de l'œil, qui est le mécanisme de la myopie. Les enfants qui passent moins d'une heure par jour dehors sont mesurablement plus à risque.

L'ordonnance protectrice est étonnamment simple : au moins 90 minutes dehors chaque jour, la règle du 20-20-20 pendant les devoirs et les écrans (toutes les 20 minutes, regarder à 6 mètres pendant 20 secondes), et une distance de lecture d'au moins 30 cm. Les signes qui justifient un examen sans attendre le dépistage scolaire : plisser les yeux pour voir loin, se rapprocher toujours plus de la télévision, des maux de tête après les cours, ou des notes qui remontent au premier rang.$txt$,
    '/articles/eyes.jpg',
    NOW() - INTERVAL '75 days 3 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000016',
    $txt$Asthma flare-ups and dusty winds: a seasonal reminder$txt$,
    $txt$Crises d'asthme et vents de sable : un rappel saisonnier$txt$,
    'report',
    $txt$Sirocco days fill our waiting rooms with wheezing patients. How to prepare, and why a written action plan changes everything.$txt$,
    $txt$Les jours de sirocco remplissent nos salles d'attente de patients essoufflés. Comment s'y préparer, et pourquoi un plan d'action écrit change tout.$txt$,
    $txt$Every episode of hot, dust-laden wind brings a spike of asthma consultations within 48 hours — this month has followed the pattern exactly. Fine desert dust irritates airways directly and carries allergens deep into the lungs; patients with poorly controlled asthma feel it first.

On dust days: stay indoors as much as possible with windows closed, avoid outdoor exercise, and if you must go out, a well-fitted FFP2 mask filters a meaningful share of particles. Rinse your nose with saline when back inside.

The deeper lesson from these seasonal spikes is about baseline control. If you use your blue reliever inhaler more than twice a week, wake at night with cough or wheeze, or feel limited in daily activities, your asthma is not controlled — regardless of the weather. Modern maintenance treatment prevents most crises, and every asthma patient should leave a consultation with a written action plan: which medication, at which dose, at which sign. If you do not have one, that is a good reason to book an appointment this month.$txt$,
    $txt$Chaque épisode de vent chaud chargé de sable amène un pic de consultations pour asthme dans les 48 heures — ce mois-ci a suivi le schéma à la lettre. Les poussières fines du désert irritent directement les bronches et transportent des allergènes au fond des poumons ; les patients dont l'asthme est mal contrôlé le sentent en premier.

Les jours de sable : restez à l'intérieur autant que possible fenêtres fermées, évitez le sport en extérieur, et si vous devez sortir, un masque FFP2 bien ajusté filtre une part significative des particules. Rincez-vous le nez au sérum physiologique en rentrant.

La vraie leçon de ces pics saisonniers concerne le contrôle de fond. Si vous utilisez votre bronchodilatateur bleu plus de deux fois par semaine, si la toux ou les sifflements vous réveillent la nuit, ou si vous vous sentez limité dans les activités quotidiennes, votre asthme n'est pas contrôlé — quelle que soit la météo. Les traitements de fond modernes préviennent la plupart des crises, et chaque patient asthmatique devrait repartir de consultation avec un plan d'action écrit : quel médicament, à quelle dose, à quel signe. Si vous n'en avez pas, c'est une bonne raison de prendre rendez-vous ce mois-ci.$txt$,
    '/articles/flu.jpg',
    NOW() - INTERVAL '80 days 5 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000011',
    $txt$Breast cancer screening month: early detection saves lives$txt$,
    $txt$Mois du dépistage du cancer du sein : détecter tôt sauve des vies$txt$,
    'report',
    $txt$Screening findings from October, the ages and intervals that matter, and what to do between mammograms.$txt$,
    $txt$Le bilan de notre mois d'octobre, les âges et les rythmes qui comptent, et quoi faire entre deux mammographies.$txt$,
    $txt$October brought a welcome wave of screening consultations to our practice, and the results illustrate why the campaign exists: among the women screened, several early lesions were found at a stage where treatment is most effective and least invasive. Detected early, breast cancer is cured in the large majority of cases.

The framework is simple. From age 40 to 45, discuss your personal risk with your doctor; from 50 to 69, a mammogram every two years is the standard rhythm. With a family history of breast or ovarian cancer, screening starts earlier and may include additional imaging — mention it explicitly at your consultation.

Between mammograms, know your own breasts: once a month, a few days after your period, look and feel. What deserves a consultation without delay — a new lump, skin dimpling, a retracted nipple, discharge, or redness that does not fade. Most of these turn out benign, but the only way to know is to check. Do not let fear postpone a visit; early is precisely when we can do the most.$txt$,
    $txt$Octobre a amené une belle vague de consultations de dépistage au cabinet, et les résultats illustrent la raison d'être de la campagne : parmi les femmes dépistées, plusieurs lésions précoces ont été trouvées à un stade où le traitement est le plus efficace et le moins invasif. Détecté tôt, le cancer du sein guérit dans la grande majorité des cas.

Le cadre est simple. De 40 à 45 ans, discutez de votre risque personnel avec votre médecin ; de 50 à 69 ans, une mammographie tous les deux ans est le rythme de référence. En cas d'antécédents familiaux de cancer du sein ou de l'ovaire, le dépistage commence plus tôt et peut inclure une imagerie complémentaire — signalez-le explicitement en consultation.

Entre deux mammographies, connaissez vos seins : une fois par mois, quelques jours après les règles, regardez et palpez. Ce qui mérite une consultation sans délai : une boule nouvelle, une peau qui se creuse, un mamelon rétracté, un écoulement, ou une rougeur qui ne s'estompe pas. La plupart de ces signes s'avèrent bénins, mais la seule façon de le savoir est de vérifier. Ne laissez pas la peur retarder une visite ; c'est justement tôt que nous pouvons faire le plus.$txt$,
    '/articles/default-report.jpg',
    NOW() - INTERVAL '85 days 2 hours'
  )
) AS v(author_id, title, title_fr, category, excerpt, excerpt_fr, body, body_fr, cover_image, created_at)
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE title = 'Hypertension screening campaign: one in four did not know');

-- ─────────────────────────────────────────────────────────────────────
-- 3e. New discussions (23-30 of 30)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO articles (author_id, title, title_fr, category, excerpt, excerpt_fr, body, body_fr, cover_image, created_at)
SELECT v.author_id::uuid, v.title, v.title_fr, v.category, v.excerpt, v.excerpt_fr, v.body, v.body_fr, v.cover_image, v.created_at
FROM (VALUES
  (
    'd0000000-0000-4000-a000-000000000004',
    $txt$How do you get children to actually eat vegetables?$txt$,
    $txt$Comment amener les enfants à vraiment manger des légumes ?$txt$,
    'discussion',
    $txt$Beyond "hide the courgettes" — what has genuinely worked with your children or your patients' families?$txt$,
    $txt$Au-delà de « cacher les courgettes » — qu'est-ce qui a vraiment fonctionné avec vos enfants ou les familles de vos patients ?$txt$,
    $txt$A question I hear at almost every consultation: "Doctor, my child refuses everything green — what do I do?" The evidence says repeated, pressure-free exposure works: a new vegetable may need to appear on the plate eight to ten times before being accepted, in small portions, without forcing or bargaining.

What I suggest to families: let children help cook (they eat what they helped make), serve vegetables first when hunger is at its peak, keep a "one polite bite" rule without drama, and remember that a food refused today is not refused forever. Parents eating the same vegetables with visible pleasure remains the strongest influence we know.

But textbooks are one thing and dinner tables another. Parents and colleagues: what has actually worked at home? Soup as a vehicle? Raw rather than cooked? Growing two pots of tomatoes on the balcony? Share your successes — and your failures — below.$txt$,
    $txt$Une question que j'entends à presque chaque consultation : « Docteur, mon enfant refuse tout ce qui est vert — que faire ? » Les études sont claires : l'exposition répétée sans pression fonctionne. Un légume nouveau peut devoir apparaître huit à dix fois dans l'assiette avant d'être accepté, en petites portions, sans forcer ni marchander.

Ce que je propose aux familles : faire participer les enfants à la cuisine (on mange ce qu'on a aidé à préparer), servir les légumes en premier quand la faim est au maximum, garder une règle d'« une bouchée de politesse » sans drame, et se rappeler qu'un aliment refusé aujourd'hui n'est pas refusé pour toujours. Des parents qui mangent les mêmes légumes avec un plaisir visible restent la plus forte influence connue.

Mais les manuels sont une chose et la table du dîner une autre. Parents et confrères : qu'est-ce qui a réellement marché chez vous ? La soupe comme véhicule ? Cru plutôt que cuit ? Deux pots de tomates sur le balcon ? Partagez vos réussites — et vos échecs — ci-dessous.$txt$,
    '/articles/child.jpg',
    NOW() - INTERVAL '16 days 4 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000016',
    $txt$Quitting smoking: what has actually worked for your patients?$txt$,
    $txt$Arrêter de fumer : qu'est-ce qui a vraiment marché pour vos patients ?$txt$,
    'discussion',
    $txt$Patches, medication, apps, cold turkey, hypnosis — a pulmonologist asks colleagues and ex-smokers to compare notes.$txt$,
    $txt$Patchs, médicaments, applications, arrêt net, hypnose — un pneumologue invite confrères et ex-fumeurs à comparer leurs expériences.$txt$,
    $txt$I spend a good part of my consultations talking about quitting smoking, and one honest observation: different patients succeed by very different routes. The evidence base is solid — nicotine replacement roughly doubles success rates, prescription medication helps many, and support (even brief, repeated encouragement from a doctor) adds a measurable margin. Most successful quitters needed several attempts; a relapse is a step in the process, not a failure of character.

What intrigues me is the variety in real life. I have patients who failed with every patch and gum, then quit overnight when their first grandchild was born. Others swear by an app counting smoke-free days and money saved, by running, or by replacing the after-coffee cigarette with a walk.

So let us compare notes, colleagues and ex-smokers alike: what tipped the balance for you or your patients? What should we stop recommending because it never seems to work? The comment section is open — your experience may be exactly what another reader needs.$txt$,
    $txt$Je passe une bonne partie de mes consultations à parler d'arrêt du tabac, et une observation honnête s'impose : des patients différents réussissent par des chemins très différents. Les données sont solides — les substituts nicotiniques doublent environ les chances de succès, les médicaments sur ordonnance aident beaucoup, et le soutien (même un encouragement bref mais répété du médecin) ajoute une marge mesurable. La plupart de ceux qui ont réussi ont eu besoin de plusieurs tentatives ; une rechute est une étape du processus, pas une faiblesse de caractère.

Ce qui m'intrigue, c'est la variété du terrain. J'ai des patients qui ont échoué avec tous les patchs et gommes, puis arrêté du jour au lendemain à la naissance de leur premier petit-enfant. D'autres ne jurent que par une application qui compte les jours sans tabac et l'argent économisé, par la course à pied, ou par la marche qui remplace la cigarette d'après-café.

Alors comparons nos notes, confrères comme ex-fumeurs : qu'est-ce qui a fait pencher la balance pour vous ou vos patients ? Que devrions-nous cesser de recommander parce que cela ne semble jamais marcher ? Les commentaires sont ouverts — votre expérience est peut-être exactement ce qu'il faut à un autre lecteur.$txt$,
    '/articles/default-discussion.jpg',
    NOW() - INTERVAL '20 days 6 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000013',
    $txt$Fasting with a chronic condition: how do you prepare your patients?$txt$,
    $txt$Jeûner avec une maladie chronique : comment préparez-vous vos patients ?$txt$,
    'discussion',
    $txt$Ramadan raises real medical questions for diabetes, hypertension and kidney patients. Let's share our adjustment protocols.$txt$,
    $txt$Le ramadan pose de vraies questions médicales pour le diabète, l'hypertension ou les reins. Partageons nos protocoles d'adaptation.$txt$,
    $txt$Every year before Ramadan, my consultations fill with the same excellent question: "Can I fast safely, and how?" For many patients with well-controlled conditions the answer is yes, with preparation. For others — insulin-treated diabetes with frequent hypoglycaemia, advanced kidney disease, a recent cardiac event — medicine and religion both point the same way: health comes first, and exemptions exist precisely for this.

My routine: a pre-Ramadan consultation four to six weeks ahead, medication timing shifted to suhoor and iftar, long-acting formulations where possible, clear hydration targets between sunset and dawn, and written stop-fasting criteria — glucose below 0.70 g/L or above 3 g/L, dizziness, chest pain. The patient breaks the fast that day and we reassess, without guilt.

Colleagues, how do you handle it? Diuretics in summer Ramadans? Metformin split at the two meals? And patients — what practical tricks helped you fast serenely? Let us build a shared reference in the comments.$txt$,
    $txt$Chaque année avant le ramadan, mes consultations se remplissent de la même excellente question : « Puis-je jeûner sans risque, et comment ? » Pour beaucoup de patients dont la maladie est bien équilibrée, la réponse est oui, avec préparation. Pour d'autres — diabète sous insuline avec hypoglycémies fréquentes, insuffisance rénale avancée, événement cardiaque récent — la médecine et la religion pointent dans la même direction : la santé d'abord, et les dispenses existent précisément pour cela.

Ma routine : une consultation pré-ramadan quatre à six semaines avant, les horaires de prise décalés vers le shour et l'iftar, des formes à libération prolongée quand c'est possible, des objectifs d'hydratation clairs entre le coucher et le lever du soleil, et des critères écrits d'arrêt du jeûne — glycémie sous 0,70 g/L ou au-dessus de 3 g/L, vertiges, douleur thoracique. Le patient rompt le jeûne ce jour-là et on réévalue, sans culpabilité.

Chers confrères, comment faites-vous ? Les diurétiques pendant les ramadans d'été ? La metformine répartie sur les deux repas ? Et chers patients — quelles astuces pratiques vous ont aidés à jeûner sereinement ? Construisons une référence commune en commentaires.$txt$,
    '/articles/nutrition.jpg',
    NOW() - INTERVAL '24 days 3 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000012',
    $txt$Exam season stress: how are you supporting students this year?$txt$,
    $txt$Stress des examens : comment accompagnez-vous les étudiants cette année ?$txt$,
    'discussion',
    $txt$Bac season turns anxiety into a public health topic. Practical approaches for families — and an open thread for yours.$txt$,
    $txt$La période du bac transforme l'anxiété en sujet de santé publique. Des approches concrètes pour les familles — et un fil ouvert pour les vôtres.$txt$,
    $txt$Bac season is approaching and, as every year, my waiting room fills with exhausted students and worried parents. Some stress is normal and even useful — it sharpens attention. It becomes a problem when sleep collapses, panic blocks work, or the student stops eating normally.

What I repeat most often: protect sleep as fiercely as revision time, because a night of sleep consolidates more memory than three extra hours of 2 am studying. Keep physical activity — twenty minutes of walking resets an anxious brain. Plan revision in 45-minute blocks with real breaks, and keep phones out of the study room, not just on silent. Parents: your calm is contagious; so is your panic. Feed them properly, avoid comparing them to cousins, and remind them an exam measures a performance, not a person's worth.

Teachers, parents, students, colleagues — what actually helps in your experience? Breathing techniques? Study groups? I will compile the best suggestions from the comments into a follow-up post before the exams.$txt$,
    $txt$La période du bac approche et, comme chaque année, ma salle d'attente se remplit d'étudiants épuisés et de parents inquiets. Un certain stress est normal et même utile — il aiguise l'attention. Il devient un problème quand le sommeil s'effondre, quand la panique bloque le travail, ou quand l'étudiant cesse de manger normalement.

Ce que je répète le plus souvent : protégez le sommeil aussi farouchement que le temps de révision, car une nuit de sommeil consolide plus de mémoire que trois heures de bachotage à 2 h du matin. Gardez une activité physique — vingt minutes de marche remettent à zéro un cerveau anxieux. Planifiez les révisions par blocs de 45 minutes avec de vraies pauses, et sortez les téléphones de la pièce de travail, pas seulement en silencieux. Parents : votre calme est contagieux ; votre panique aussi. Nourrissez-les correctement, évitez les comparaisons avec les cousins, et rappelez-leur qu'un examen mesure une performance, pas la valeur d'une personne.

Enseignants, parents, étudiants, confrères — qu'est-ce qui aide vraiment d'après votre expérience ? Techniques de respiration ? Groupes de révision ? Je compilerai les meilleures suggestions des commentaires dans une publication de suivi avant les épreuves.$txt$,
    '/articles/mental.jpg',
    NOW() - INTERVAL '28 days 2 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000003',
    $txt$Migraine triggers: what do your patients report most?$txt$,
    $txt$Déclencheurs de migraine : que rapportent le plus vos patients ?$txt$,
    'discussion',
    $txt$Sleep, screens, cheese, weather, hormones — a neurologist opens the trigger diary debate.$txt$,
    $txt$Sommeil, écrans, fromage, météo, hormones — un neurologue ouvre le débat du journal des déclencheurs.$txt$,
    $txt$Ask ten migraine patients about their triggers and you get ten different lists. In my consultations the recurring ones are irregular sleep — both too little and weekend lie-ins — skipped meals, dehydration, prolonged screen work, hormonal cycles, and stress, with its treacherous habit of triggering the attack when the stress ends, on Saturday morning.

The evidence adds nuance: some classic "triggers" like chocolate cravings may actually be the first symptom of an attack already starting, not its cause. This is why I ask patients to keep a simple diary for two months — date, sleep, meals, cycle, weather, screen hours — before we blame any food. Real, confirmed triggers deserve avoidance; imaginary ones just shrink life unnecessarily.

Colleagues and patients, I am curious: which triggers keep showing up in your diaries? Has anyone identified an unusual but reproducible one? And which widely-blamed trigger turned out, in your case, to be innocent? The comments are open.$txt$,
    $txt$Interrogez dix patients migraineux sur leurs déclencheurs et vous obtiendrez dix listes différentes. Dans mes consultations, les récurrents sont le sommeil irrégulier — trop court comme les grasses matinées du week-end — les repas sautés, la déshydratation, le travail prolongé sur écran, les cycles hormonaux, et le stress, avec sa fâcheuse habitude de déclencher la crise quand il retombe, le samedi matin.

Les études ajoutent une nuance : certains « déclencheurs » classiques, comme l'envie de chocolat, seraient en réalité le premier symptôme d'une crise déjà commencée, et non sa cause. C'est pourquoi je demande à mes patients de tenir un journal simple pendant deux mois — date, sommeil, repas, cycle, météo, heures d'écran — avant d'accuser un aliment. Les déclencheurs réels et confirmés méritent d'être évités ; les imaginaires ne font que rétrécir la vie inutilement.

Confrères et patients, je suis curieux : quels déclencheurs reviennent sans cesse dans vos journaux ? Quelqu'un a-t-il identifié un déclencheur inhabituel mais reproductible ? Et quel coupable désigné s'est révélé, dans votre cas, innocent ? Les commentaires sont ouverts.$txt$,
    '/articles/brain.jpg',
    NOW() - INTERVAL '30 days 5 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000014',
    $txt$Kidney stones spike every summer — what prevention advice works?$txt$,
    $txt$Les calculs rénaux flambent chaque été — quels conseils de prévention fonctionnent ?$txt$,
    'discussion',
    $txt$Heat plus concentrated urine equals stone season. A urologist shares his checklist and asks for yours.$txt$,
    $txt$Chaleur plus urines concentrées égalent saison des calculs. Un urologue partage sa check-list et demande la vôtre.$txt$,
    $txt$Summer is stone season in urology: heat concentrates urine, and concentrated urine crystallises. Every July and August the pattern repeats — more renal colic, often in patients who had a first episode years ago and drifted back to old habits.

For anyone who has had a stone, recurrence risk is roughly one in two within ten years — but prevention genuinely works. The core of it is unglamorous: drink enough to produce at least 2 litres of urine a day, which in a Tunisian summer means 2.5 to 3 litres of fluid. The visual check is the easiest compliance tool I know: urine should stay pale yellow. Beyond water: moderate salt heavily (salt drags calcium into urine), keep normal dietary calcium (restricting it paradoxically increases oxalate stones), go easy on cola drinks, and moderate animal protein.

Fellow doctors, what actually keeps your patients drinking — phone reminders, a marked bottle, citrus in the water? And former stone patients: what made you finally stick to prevention, the advice or the memory of the pain? Share below.$txt$,
    $txt$L'été est la saison des calculs en urologie : la chaleur concentre les urines, et des urines concentrées cristallisent. Chaque juillet-août, le schéma se répète — plus de coliques néphrétiques, souvent chez des patients qui ont fait un premier épisode il y a des années et sont revenus à leurs vieilles habitudes.

Pour qui a déjà eu un calcul, le risque de récidive est d'environ un sur deux en dix ans — mais la prévention fonctionne réellement. Son cœur n'a rien de glamour : boire assez pour produire au moins 2 litres d'urine par jour, ce qui, dans un été tunisien, signifie 2,5 à 3 litres de liquide. Le contrôle visuel est l'outil d'observance le plus simple que je connaisse : les urines doivent rester jaune pâle. Au-delà de l'eau : réduire fortement le sel (le sel entraîne le calcium dans les urines), garder un apport calcique alimentaire normal (le restreindre augmente paradoxalement les calculs d'oxalate), lever le pied sur les colas, et modérer les protéines animales.

Chers confrères, qu'est-ce qui fait vraiment boire vos patients — rappels sur téléphone, bouteille graduée, agrumes dans l'eau ? Et anciens patients : qu'est-ce qui vous a fait enfin tenir la prévention, le conseil ou le souvenir de la douleur ? Partagez ci-dessous.$txt$,
    '/articles/hydration.jpg',
    NOW() - INTERVAL '34 days 4 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000017',
    $txt$Joint pain in older patients: what helps beyond painkillers?$txt$,
    $txt$Douleurs articulaires chez les patients âgés : qu'est-ce qui aide au-delà des antalgiques ?$txt$,
    'discussion',
    $txt$Osteoarthritis management is more than a prescription. Movement, weight, heat, aids — what combination works for your patients?$txt$,
    $txt$La prise en charge de l'arthrose ne se résume pas à une ordonnance. Mouvement, poids, chaleur, aides — quelle combinaison marche chez vos patients ?$txt$,
    $txt$"Doctor, do I just have to live with it?" is the sentence I hear most about osteoarthritis. My answer is no — but honest management is a combination, not a single pill. The strongest evidence is for movement: regular, gentle activity like walking, swimming or cycling keeps joints lubricated and muscles supportive. Rest beyond a flare-up makes stiffness worse, not better.

Weight matters enormously for knees and hips: each kilo lost removes roughly four kilos of load from the knee at every step. Heat relieves stiff joints in the morning; physiotherapy teaches protective movement patterns; a cane on the opposite side unloads a painful hip remarkably well — once patients accept it, which is its own discussion. Paracetamol and short courses of anti-inflammatories have their place, with real caution in older kidneys and stomachs.

Colleagues — rheumatologists, GPs, physiotherapists — and patients living with osteoarthritis: what combination has genuinely improved daily life? Any experience with group exercise programs locally? Let us pool what works.$txt$,
    $txt$« Docteur, il faut juste vivre avec ? » est la phrase que j'entends le plus au sujet de l'arthrose. Ma réponse est non — mais une prise en charge honnête est une combinaison, pas un comprimé unique. Les preuves les plus solides concernent le mouvement : une activité douce et régulière comme la marche, la natation ou le vélo lubrifie les articulations et entretient les muscles qui les soutiennent. Le repos au-delà d'une poussée aggrave la raideur au lieu de l'améliorer.

Le poids compte énormément pour les genoux et les hanches : chaque kilo perdu retire environ quatre kilos de charge du genou à chaque pas. La chaleur soulage les articulations raides le matin ; la kinésithérapie enseigne des gestes protecteurs ; une canne du côté opposé décharge remarquablement une hanche douloureuse — une fois que les patients l'acceptent, ce qui est une discussion en soi. Le paracétamol et les anti-inflammatoires en cures courtes ont leur place, avec une vraie prudence pour les reins et l'estomac des aînés.

Confrères — rhumatologues, généralistes, kinés — et patients qui vivent avec l'arthrose : quelle combinaison a réellement amélioré le quotidien ? Une expérience avec des programmes d'exercice en groupe près de chez vous ? Mettons en commun ce qui marche.$txt$,
    '/articles/elderly.jpg',
    NOW() - INTERVAL '38 days 6 hours'
  ),
  (
    'd0000000-0000-4000-a000-000000000020',
    $txt$Teens, screens and sleep: what limits actually work at home?$txt$,
    $txt$Ados, écrans et sommeil : quelles limites fonctionnent vraiment à la maison ?$txt$,
    'discussion',
    $txt$Chronic sleep debt is the most common teen health issue I see. Parents, what rules survived contact with reality?$txt$,
    $txt$La dette de sommeil chronique est le problème de santé adolescent que je vois le plus. Parents, quelles règles ont survécu à l'épreuve du réel ?$txt$,
    $txt$If I had to name the most common health problem among the teenagers in my practice, it would not be infections — it would be sleep debt. An adolescent needs 8 to 10 hours; most I see get 6 to 7 on school nights, and the phone is almost always in the story. Biology stacks the deck: the teenage body clock naturally shifts later, and evening screen light pushes it later still.

Chronic short sleep in teens shows up as morning headaches, falling grades, irritability, snacking and low mood — families often consult for those symptoms without suspecting the cause. What seems to work, from families in my practice: charging phones outside the bedroom overnight (the single highest-impact rule), screens off 45 minutes before bed, and — crucially — parents modelling the same rule rather than scrolling in bed themselves.

But I know these rules are easier prescribed than enforced with a 15-year-old. Parents, what has actually survived contact with reality at your house? Negotiated contracts? Wi-Fi timers? Teenagers reading this — what would convince you? Honest answers welcome below.$txt$,
    $txt$Si je devais nommer le problème de santé le plus fréquent chez les adolescents de ma patientèle, ce ne seraient pas les infections — ce serait la dette de sommeil. Un adolescent a besoin de 8 à 10 heures ; la plupart de ceux que je vois dorment 6 à 7 heures les soirs de classe, et le téléphone est presque toujours dans l'histoire. La biologie n'aide pas : l'horloge interne adolescente se décale naturellement vers le soir, et la lumière des écrans la retarde encore.

Le manque chronique de sommeil chez l'ado se manifeste par des maux de tête matinaux, des notes qui baissent, de l'irritabilité, du grignotage et un moral en berne — les familles consultent souvent pour ces symptômes sans en soupçonner la cause. Ce qui semble marcher, d'après les familles de ma patientèle : recharger les téléphones hors de la chambre la nuit (la règle au plus fort impact), écrans éteints 45 minutes avant le coucher, et — point crucial — des parents qui appliquent la même règle au lieu de scroller au lit.

Mais je sais que ces règles sont plus faciles à prescrire qu'à faire respecter avec un ado de 15 ans. Parents, qu'est-ce qui a réellement survécu à l'épreuve du réel chez vous ? Contrats négociés ? Minuteur sur le Wi-Fi ? Adolescents qui lisez ceci — qu'est-ce qui vous convaincrait ? Réponses honnêtes bienvenues ci-dessous.$txt$,
    '/articles/sleep.jpg',
    NOW() - INTERVAL '42 days 3 hours'
  )
) AS v(author_id, title, title_fr, category, excerpt, excerpt_fr, body, body_fr, cover_image, created_at)
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE title = 'How do you get children to actually eat vegetables?');
