import { z } from 'zod';

/** 24-character hex MongoDB ObjectId string */
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
