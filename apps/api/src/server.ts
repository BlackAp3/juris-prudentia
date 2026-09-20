import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { apiRouter } from "./routes/index.js";

const app = express();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);

const configuredOrigins = process.env.WEB_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean);

app.use(helmet());
app.use(cors({ origin: configuredOrigins?.length ? configuredOrigins : true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "juris-prudentia-api" });
});

app.use("/api/v1", apiRouter);

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found" });
});

app.listen(port, () => {
  console.log(`Juris Prudentia API listening on port ${port}`);
});
