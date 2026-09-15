import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email("Некорректный email").max(120),
  name: z
    .string()
    .trim()
    .min(2, "Имя — минимум 2 символа")
    .max(18, "Имя — максимум 18 символов"),
  password: z.string().min(6, "Пароль — минимум 6 символов").max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Некорректный email").max(120),
  password: z.string().min(1, "Введите пароль").max(128),
});

export const savePayloadSchema = z.object({
  data: z.unknown(),
});
