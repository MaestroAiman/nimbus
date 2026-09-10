import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  BETTER_AUTH_SECRET: Joi.string().min(32).required(),
  BETTER_AUTH_URL: Joi.string().uri().default('http://localhost:3000'),
  STORAGE_PATH: Joi.string().default('./storage'),
});
