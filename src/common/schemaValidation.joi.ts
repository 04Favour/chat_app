/* eslint-disable prettier/prettier */
import Joi from "joi";

export const ConfigValidation = Joi.object({
    POSTGRES_HOST: Joi.string().required(),
    POSTGRES_PASSWORD: Joi.string().required(),
    // POSTGRES_USER: Joi.string().required().default('postgres'),
    POSTGRES_PORT: Joi.number().required(),
    POSTGRES_NAME: Joi.string().required().default('nestjs_chat'),
    JWT_SECRET: Joi.string().required(),
    JWT_EXPIRES_IN: Joi.string().required(),
    NODE_ENV: Joi.string().required(),
    PORT: Joi.string().required()
})