// Parapharmacie catalog — shared by the home marquee and the /shop page.
// Prototype data: prices in Tunisian Dinar (DT), images are self-hosted in /public/products.

export const PRODUCT_CATEGORIES = [
  'Devices',
  'First Aid',
  'Supplements',
  'Skincare',
  'Hygiene',
  'Baby & Mother',
  'Hair Care',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export type ProductTag = 'Best seller' | 'New' | 'Sale';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  /** Optional strike-through original price (for "Sale"). */
  compareAt?: number;
  image: string;
  short: string;
  description: string;
  highlights: string[];
  rating: number;
  reviews: number;
  tag?: ProductTag;
}

export const PRODUCTS: Product[] = [
  {
    id: 'digital-thermometer',
    name: 'Digital Thermometer',
    category: 'Devices',
    price: 25,
    image: '/products/thermometer.jpg',
    short: 'Fast, accurate readings in 10 seconds.',
    description:
      'A flexible-tip digital thermometer that delivers a precise reading in about 10 seconds, with a fever alarm and a memory of your last measurement. Waterproof tip for oral, underarm, or rectal use.',
    highlights: ['±0.1°C accuracy', '10-second reading', 'Fever alarm & memory', 'Waterproof flexible tip'],
    rating: 4.7,
    reviews: 214,
    tag: 'Best seller',
  },
  {
    id: 'blood-pressure-monitor',
    name: 'Blood Pressure Monitor',
    category: 'Devices',
    price: 120,
    image: '/products/blood-pressure.jpg',
    short: 'Clinically validated home BP cuff.',
    description:
      'An automatic upper-arm blood pressure monitor with a large backlit display, irregular-heartbeat detection, and two-user memory storing 90 readings each. Clinically validated for home use.',
    highlights: ['Upper-arm automatic cuff', 'Irregular heartbeat detection', '2 users × 90 readings', 'Large backlit display'],
    rating: 4.6,
    reviews: 138,
  },
  {
    id: 'pulse-oximeter',
    name: 'Pulse Oximeter',
    category: 'Devices',
    price: 60,
    image: '/products/oximeter.jpg',
    short: 'Track SpO₂ and heart rate at home.',
    description:
      'A fingertip pulse oximeter with a bright OLED display that measures blood-oxygen saturation (SpO₂) and pulse rate in seconds. Auto power-off and low-battery indicator included.',
    highlights: ['SpO₂ + pulse rate', 'OLED display', 'Results in <10s', 'Auto power-off'],
    rating: 4.5,
    reviews: 96,
  },
  {
    id: 'blood-glucose-monitor',
    name: 'Blood Glucose Monitor',
    category: 'Devices',
    price: 90,
    image: '/products/glucose.jpg',
    short: 'Simple at-home glucose testing.',
    description:
      'A compact blood-glucose meter kit with lancing device and starter test strips. Delivers results in 5 seconds from a tiny sample and stores your recent readings to track trends.',
    highlights: ['5-second results', 'Tiny 0.6 µL sample', 'Stores 500 readings', 'Kit with lancets & strips'],
    rating: 4.4,
    reviews: 72,
    tag: 'New',
  },
  {
    id: 'first-aid-kit',
    name: 'Home First Aid Kit',
    category: 'First Aid',
    price: 45,
    image: '/products/first-aid.jpg',
    short: '80-piece kit for home and travel.',
    description:
      'A compact, fully-stocked 80-piece first aid kit in a durable zip case — bandages, sterile gauze, antiseptic wipes, tape, scissors, and tweezers. Perfect for the home, car, or travel bag.',
    highlights: ['80 essential pieces', 'Durable zip case', 'Home, car & travel', 'Organised compartments'],
    rating: 4.8,
    reviews: 187,
  },
  {
    id: 'surgical-masks',
    name: 'Surgical Face Masks (50)',
    category: 'First Aid',
    price: 18,
    compareAt: 24,
    image: '/products/masks.jpg',
    short: 'Box of 50 · 3-ply protection.',
    description:
      'A box of 50 disposable 3-ply surgical masks with a soft inner layer and an adjustable nose bridge for a comfortable, secure fit. Breathable and latex-free.',
    highlights: ['3-ply filtration', 'Box of 50', 'Adjustable nose bridge', 'Latex-free & breathable'],
    rating: 4.6,
    reviews: 320,
    tag: 'Sale',
  },
  {
    id: 'hand-sanitizer',
    name: 'Hand Sanitizer Pack',
    category: 'Hygiene',
    price: 15,
    image: '/products/sanitizer.jpg',
    short: 'Pack of 5 · 70% alcohol gel.',
    description:
      'A pack of five 250 ml pump bottles of 70% alcohol hand-sanitising gel, enriched with vitamin E to protect your skin. Kills 99.9% of common germs without water.',
    highlights: ['70% alcohol gel', 'Kills 99.9% of germs', 'With vitamin E', 'Pack of 5 × 250 ml'],
    rating: 4.5,
    reviews: 143,
  },
  {
    id: 'vitamin-d3',
    name: 'Vitamin D3 · 2000 IU',
    category: 'Supplements',
    price: 30,
    image: '/products/vitamins.jpg',
    short: '90 capsules, daily immune support.',
    description:
      'High-strength vitamin D3 (cholecalciferol) at 2000 IU per softgel to support bones, muscles, and immune function — a 3-month supply. One easy-swallow capsule a day.',
    highlights: ['2000 IU per capsule', '90 capsules (3 months)', 'Bone & immune support', 'One-a-day'],
    rating: 4.7,
    reviews: 205,
  },
  {
    id: 'vitamin-c-serum',
    name: 'Vitamin C Facial Serum',
    category: 'Skincare',
    price: 55,
    image: '/products/serum.jpg',
    short: 'Brightening antioxidant serum.',
    description:
      'A lightweight facial serum with 15% vitamin C and hyaluronic acid that brightens dull skin, evens tone, and boosts hydration. Dermatologically tested and suitable for daily use.',
    highlights: ['15% vitamin C', 'With hyaluronic acid', 'Brightens & evens tone', 'Dermatologically tested'],
    rating: 4.6,
    reviews: 118,
    tag: 'Best seller',
  },
  {
    id: 'aqua-moisturizer',
    name: 'Aqua Face Moisturizer',
    category: 'Skincare',
    price: 40,
    image: '/products/face-cream.jpg',
    short: 'Oil-free 24h hydration gel-cream.',
    description:
      'A refreshing oil-free gel-cream that delivers 24-hour hydration with mineral complex and hyaluronic acid. Absorbs instantly, leaving skin soft and matte — ideal for oily and combination skin.',
    highlights: ['24-hour hydration', 'Oil-free gel-cream', 'For oily & combination skin', 'Non-comedogenic'],
    rating: 4.4,
    reviews: 89,
  },
  {
    id: 'sunscreen-spf50',
    name: 'Sunscreen SPF 50',
    category: 'Skincare',
    price: 35,
    image: '/products/sunscreen.jpg',
    short: 'Broad-spectrum SPF 50 body cream.',
    description:
      'A broad-spectrum SPF 50 sunscreen that shields against UVA and UVB rays. Water-resistant, non-greasy, and quick-absorbing for everyday face and body protection.',
    highlights: ['SPF 50 broad-spectrum', 'UVA + UVB protection', 'Water-resistant', 'Non-greasy finish'],
    rating: 4.7,
    reviews: 156,
  },
  {
    id: 'bamboo-toothbrush',
    name: 'Bamboo Toothbrush Set',
    category: 'Hygiene',
    price: 12,
    image: '/products/toothbrush.jpg',
    short: 'Pack of 4 · soft charcoal bristles.',
    description:
      'A set of four eco-friendly bamboo toothbrushes with soft, charcoal-infused bristles that gently clean and help freshen breath. Biodegradable handle and plastic-free packaging.',
    highlights: ['Pack of 4', 'Soft charcoal bristles', 'Biodegradable handle', 'Plastic-free packaging'],
    rating: 4.5,
    reviews: 64,
  },
  {
    id: 'baby-wash',
    name: 'Baby Wash & Shampoo',
    category: 'Baby & Mother',
    price: 22,
    image: '/products/baby-wash.jpg',
    short: '2-in-1 · tear-free, 500 ml.',
    description:
      'A gentle 2-in-1 baby wash and shampoo with a tear-free, pH-balanced formula that cleans delicate skin and hair without drying. Paediatrician-tested and hypoallergenic.',
    highlights: ['Tear-free 2-in-1', 'pH-balanced', 'Paediatrician-tested', 'Hypoallergenic · 500 ml'],
    rating: 4.8,
    reviews: 112,
  },
  {
    id: 'repair-haircare-set',
    name: 'Repair Shampoo & Conditioner',
    category: 'Hair Care',
    price: 48,
    image: '/products/haircare.jpg',
    short: 'Repair & protect duo for damaged hair.',
    description:
      'A repair-and-protect shampoo and conditioner duo formulated to strengthen and smooth dry, damaged hair. Sulfate-free and suitable for colour-treated hair, leaving it soft and manageable.',
    highlights: ['Shampoo + conditioner', 'For damaged hair', 'Sulfate-free', 'Colour-safe'],
    rating: 4.5,
    reviews: 77,
  },
];

export const formatDT = (n: number) => `${n} DT`;
