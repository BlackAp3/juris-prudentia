import { Router } from "express";
import type { ApiResponse, CourseSummary } from "@juris/types";
import { authRouter } from "./auth.js";
import { requireAuth } from "../middleware/auth.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);

const sampleCourses: CourseSummary[] = [
  {
    id: "criminal-law-1",
    code: "LAW 2101",
    title: "Criminal Law I",
    academicYear: 2,
    semester: 1,
    topicCount: 7,
    completedTopicCount: 3,
  },
  {
    id: "evidence-law-1",
    code: "LAW 2102",
    title: "Evidence Law I",
    academicYear: 2,
    semester: 1,
    topicCount: 6,
    completedTopicCount: 1,
  },
];

apiRouter.get("/courses", requireAuth, (_request, response) => {
  const payload: ApiResponse<CourseSummary[]> = { data: sampleCourses };
  response.json(payload);
});
