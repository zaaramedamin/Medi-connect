import rateLimit from 'express-rate-limit';

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { error: 'Rate limit exceeded. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Tighter limit for the AI assistant: each call hits paid external inference
// (embedding + generation), so it's rate-limited harder than the rest of the API.
export const assistantRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  message: { error: 'You are sending questions too quickly. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});
