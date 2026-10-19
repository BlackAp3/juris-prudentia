import { Router } from "express";
import { authRouter } from "./auth.js";
import { contentRouter } from "./content.js";
import { adminRouter } from "./admin.js";
import { prisma } from "../auth.js";
import { requireAuth } from "../middleware/auth.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/content", contentRouter);
apiRouter.use("/admin", adminRouter);

apiRouter.get("/courses", requireAuth, async (request, response) => {
  const courses = await prisma.course.findMany({ orderBy: { title: "asc" }, include: { topics: { select: { id: true } }, enrollments: { where: { userId: request.authUser!.sub }, select: { completedTopicIds: true } } } });
  response.json({ data: courses.map((course) => ({ id: course.id, code: course.code, title: course.title, academicYear: course.academicYear, semester: course.semester, topicCount: course.topics.length, completedTopicCount: course.enrollments.reduce((sum, enrollment) => sum + enrollment.completedTopicIds.filter((id) => course.topics.some((topic) => topic.id === id)).length, 0) })) });
});
