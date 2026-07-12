// Server-side product catalog for the RAG product advisor. Mirrors the display
// fields from client/src/data/products.ts (kept minimal: what's embedded and
// what the recommendation prompt needs). The 14 products are static, so this
// small copy is simpler than moving the shop onto the database.

export interface AdvisorProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  short: string;
  description: string;
  highlights: string[];
}

export const PRODUCTS: AdvisorProduct[] = [
  {
    id: 'digital-thermometer',
    name: 'Digital Thermometer',
    category: 'Devices',
    price: 25,
    short: 'Fast, accurate readings in 10 seconds.',
    description:
      'A flexible-tip digital thermometer that delivers a precise reading in about 10 seconds, with a fever alarm and a memory of your last measurement. Waterproof tip for oral, underarm, or rectal use.',
    highlights: ['±0.1°C accuracy', '10-second reading', 'Fever alarm & memory', 'Waterproof flexible tip'],
  },
  {
    id: 'blood-pressure-monitor',
    name: 'Blood Pressure Monitor',
    category: 'Devices',
    price: 120,
    short: 'Clinically validated home BP cuff.',
    description:
      'An automatic upper-arm blood pressure monitor with a large backlit display, irregular-heartbeat detection, and two-user memory storing 90 readings each. Clinically validated for home use.',
    highlights: ['Upper-arm automatic cuff', 'Irregular heartbeat detection', '2 users × 90 readings', 'Large backlit display'],
  },
  {
    id: 'pulse-oximeter',
    name: 'Pulse Oximeter',
    category: 'Devices',
    price: 60,
    short: 'Track SpO₂ and heart rate at home.',
    description:
      'A fingertip pulse oximeter with a bright OLED display that measures blood-oxygen saturation (SpO₂) and pulse rate in seconds. Auto power-off and low-battery indicator included.',
    highlights: ['SpO₂ + pulse rate', 'OLED display', 'Results in <10s', 'Auto power-off'],
  },
  {
    id: 'blood-glucose-monitor',
    name: 'Blood Glucose Monitor',
    category: 'Devices',
    price: 90,
    short: 'Simple at-home glucose testing.',
    description:
      'A compact blood-glucose meter kit with lancing device and starter test strips. Delivers results in 5 seconds from a tiny sample and stores your recent readings to track trends.',
    highlights: ['5-second results', 'Tiny 0.6 µL sample', 'Stores 500 readings', 'Kit with lancets & strips'],
  },
  {
    id: 'first-aid-kit',
    name: 'Home First Aid Kit',
    category: 'First Aid',
    price: 45,
    short: '80-piece kit for home and travel.',
    description:
      'A compact, fully-stocked 80-piece first aid kit in a durable zip case — bandages, sterile gauze, antiseptic wipes, tape, scissors, and tweezers. Perfect for the home, car, or travel bag.',
    highlights: ['80 essential pieces', 'Durable zip case', 'Home, car & travel', 'Organised compartments'],
  },
  {
    id: 'surgical-masks',
    name: 'Surgical Face Masks (50)',
    category: 'First Aid',
    price: 18,
    short: 'Box of 50 · 3-ply protection.',
    description:
      'A box of 50 disposable 3-ply surgical masks with a soft inner layer and an adjustable nose bridge for a comfortable, secure fit. Breathable and latex-free.',
    highlights: ['3-ply filtration', 'Box of 50', 'Adjustable nose bridge', 'Latex-free & breathable'],
  },
  {
    id: 'hand-sanitizer',
    name: 'Hand Sanitizer Pack',
    category: 'Hygiene',
    price: 15,
    short: 'Pack of 5 · 70% alcohol gel.',
    description:
      'A pack of five 250 ml pump bottles of 70% alcohol hand-sanitising gel, enriched with vitamin E to protect your skin. Kills 99.9% of common germs without water.',
    highlights: ['70% alcohol gel', 'Kills 99.9% of germs', 'With vitamin E', 'Pack of 5 × 250 ml'],
  },
  {
    id: 'vitamin-d3',
    name: 'Vitamin D3 · 2000 IU',
    category: 'Supplements',
    price: 30,
    short: '90 capsules, daily immune support.',
    description:
      'High-strength vitamin D3 (cholecalciferol) at 2000 IU per softgel to support bones, muscles, and immune function — a 3-month supply. One easy-swallow capsule a day.',
    highlights: ['2000 IU per capsule', '90 capsules (3 months)', 'Bone & immune support', 'One-a-day'],
  },
  {
    id: 'vitamin-c-serum',
    name: 'Vitamin C Facial Serum',
    category: 'Skincare',
    price: 55,
    short: 'Brightening antioxidant serum.',
    description:
      'A lightweight facial serum with 15% vitamin C and hyaluronic acid that brightens dull skin, evens tone, and boosts hydration. Dermatologically tested and suitable for daily use.',
    highlights: ['15% vitamin C', 'With hyaluronic acid', 'Brightens & evens tone', 'Dermatologically tested'],
  },
  {
    id: 'aqua-moisturizer',
    name: 'Aqua Face Moisturizer',
    category: 'Skincare',
    price: 40,
    short: 'Oil-free 24h hydration gel-cream.',
    description:
      'A refreshing oil-free gel-cream that delivers 24-hour hydration with mineral complex and hyaluronic acid. Absorbs instantly, leaving skin soft and matte — ideal for oily and combination skin.',
    highlights: ['24-hour hydration', 'Oil-free gel-cream', 'For oily & combination skin', 'Non-comedogenic'],
  },
  {
    id: 'sunscreen-spf50',
    name: 'Sunscreen SPF 50',
    category: 'Skincare',
    price: 35,
    short: 'Broad-spectrum SPF 50 body cream.',
    description:
      'A broad-spectrum SPF 50 sunscreen that shields against UVA and UVB rays. Water-resistant, non-greasy, and quick-absorbing for everyday face and body protection.',
    highlights: ['SPF 50 broad-spectrum', 'UVA + UVB protection', 'Water-resistant', 'Non-greasy finish'],
  },
  {
    id: 'bamboo-toothbrush',
    name: 'Bamboo Toothbrush Set',
    category: 'Hygiene',
    price: 12,
    short: 'Pack of 4 · soft charcoal bristles.',
    description:
      'A set of four eco-friendly bamboo toothbrushes with soft, charcoal-infused bristles that gently clean and help freshen breath. Biodegradable handle and plastic-free packaging.',
    highlights: ['Pack of 4', 'Soft charcoal bristles', 'Biodegradable handle', 'Plastic-free packaging'],
  },
  {
    id: 'baby-wash',
    name: 'Baby Wash & Shampoo',
    category: 'Baby & Mother',
    price: 22,
    short: '2-in-1 · tear-free, 500 ml.',
    description:
      'A gentle 2-in-1 baby wash and shampoo with a tear-free, pH-balanced formula that cleans delicate skin and hair without drying. Paediatrician-tested and hypoallergenic.',
    highlights: ['Tear-free 2-in-1', 'pH-balanced', 'Paediatrician-tested', 'Hypoallergenic · 500 ml'],
  },
  {
    id: 'repair-haircare-set',
    name: 'Repair Shampoo & Conditioner',
    category: 'Hair Care',
    price: 48,
    short: 'Repair & protect duo for damaged hair.',
    description:
      'A repair-and-protect shampoo and conditioner duo formulated to strengthen and smooth dry, damaged hair. Sulfate-free and suitable for colour-treated hair, leaving it soft and manageable.',
    highlights: ['Shampoo + conditioner', 'For damaged hair', 'Sulfate-free', 'Colour-safe'],
  },
];

// The text embedded + handed to the model for one product.
export const productText = (p: AdvisorProduct): string =>
  `${p.name}. Category: ${p.category}. ${p.short} ${p.description} Highlights: ${p.highlights.join(', ')}.`;
