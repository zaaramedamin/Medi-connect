import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

export function validate(chains: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const chain of chains) {
      await chain.run(req);
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  };
}
