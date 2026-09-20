import { Router } from "express";
import { z } from "zod";
import { loginUser, prisma, refreshSession, registerUser, revokeSession, toUserSummary } from "../auth.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();
const refreshSchema = z.object({ refreshToken: z.string().min(20).max(512) });

authRouter.post("/register", async (request, response) => {
  try {
    response.status(201).json({ data: await registerUser(request.body) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({ error: "Please provide a valid name, email and password", details: error.flatten().fieldErrors });
      return;
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      response.status(409).json({ error: "An account with that email already exists" });
      return;
    }
    response.status(500).json({ error: "Unable to create account" });
  }
});

authRouter.post("/login", async (request, response) => {
  try {
    response.json({ data: await loginUser(request.body) });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      response.status(401).json({ error: "Invalid email or password" });
      return;
    }
    response.status(500).json({ error: "Unable to sign in" });
  }
});

authRouter.post("/refresh", async (request, response) => {
  const parsed = refreshSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "A refresh token is required" });
    return;
  }
  try {
    response.json({ data: await refreshSession(parsed.data.refreshToken) });
  } catch {
    response.status(401).json({ error: "Refresh token is invalid or expired" });
  }
});

authRouter.post("/logout", async (request, response) => {
  const parsed = refreshSchema.safeParse(request.body);
  if (parsed.success) await revokeSession(parsed.data.refreshToken);
  response.status(204).send();
});

authRouter.get("/me", requireAuth, async (request, response) => {
  const user = await prisma.user.findUnique({ where: { id: request.authUser!.sub } });
  if (!user || !user.isActive) {
    response.status(401).json({ error: "Account is not available" });
    return;
  }
  response.json({ data: toUserSummary(user) });
});
