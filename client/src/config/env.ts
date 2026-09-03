import { z } from "zod";

const clientEnvSchema = z.object({
  VITE_API_URL: z.string().url().default("http://localhost:3001/api/v1"),
});

const parsed = clientEnvSchema.safeParse(import.meta.env);
if (!parsed.success) {
  throw new Error(`Invalid client configuration: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
}

export const clientEnv = Object.freeze({ apiUrl: parsed.data.VITE_API_URL });
