import { z } from "zod";

const EMAIL_ERROR = "Informe um e-mail válido.";
const PASSWORD_ERROR = "A senha deve ter entre 8 e 128 caracteres.";

const credentialsSchema = z.object({
  email: z.string({ error: EMAIL_ERROR })
    .trim()
    .toLowerCase()
    .max(254, { error: EMAIL_ERROR })
    .email({ error: EMAIL_ERROR }),
  password: z.string({ error: PASSWORD_ERROR })
    .min(8, { error: PASSWORD_ERROR })
    .max(128, { error: PASSWORD_ERROR }),
}, { error: "Dados inválidos." });

export const loginSchema = credentialsSchema;
export const registerSchema = credentialsSchema;

export type CredentialsInput = z.output<typeof credentialsSchema>;
