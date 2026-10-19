import { Router } from "express";
import { prisma } from "../auth.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";

const adminOnly = requireRoles("CONTENT_EDITOR", "MODERATOR", "ADMIN", "SUPER_ADMIN");
const monthStart = () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const statusLabel = (status: string) => status.charAt(0) + status.slice(1).toLowerCase();

const completion = (topics: Array<{ id: string }>, enrollments: Array<{ completedTopicIds: string[] }>) => {
  const total = topics.length * enrollments.length;
  const completed = enrollments.reduce((sum, enrollment) => sum + enrollment.completedTopicIds.filter((id) => topics.some((topic) => topic.id === id)).length, 0);
  return total ? Math.round((completed / total) * 100) : 0;
};

export const adminRouter = Router();

adminRouter.get("/overview", requireAuth, adminOnly, async (_request, response) => {
  const start = monthStart();
  const [users, activeUsers, newUsers, courses, publishedCourses, topics, publishedTopics, notes, publishedNotes, cases, publishedCases, statutes, publishedStatutes, drafts, recentTopics, recentCases, recentArticles] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { createdAt: { gte: start } } }),
    prisma.course.count(),
    prisma.course.count({ where: { status: "PUBLISHED" } }),
    prisma.topic.count(),
    prisma.topic.count({ where: { status: "PUBLISHED" } }),
    prisma.note.count(),
    prisma.note.count({ where: { status: "PUBLISHED" } }),
    prisma.legalCase.count(),
    prisma.legalCase.count({ where: { status: "PUBLISHED" } }),
    prisma.statute.count(),
    prisma.statute.count({ where: { status: "PUBLISHED" } }),
    prisma.topic.count({ where: { status: "DRAFT" } }),
    prisma.topic.findMany({ orderBy: { updatedAt: "desc" }, take: 5, include: { course: { select: { title: true } } } }),
    prisma.legalCase.findMany({ orderBy: { updatedAt: "desc" }, take: 5, include: { topic: { include: { course: { select: { title: true } } } } } }),
    prisma.newsArticle.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }),
  ]);

  const recentContent = [
    ...recentTopics.map((item) => ({ title: item.title, subtitle: item.course.title, type: "Topic", status: statusLabel(item.status), updatedAt: item.updatedAt })),
    ...recentCases.map((item) => ({ title: item.title, subtitle: item.topic.course.title, type: "Case", status: statusLabel(item.status), updatedAt: item.updatedAt })),
    ...recentArticles.map((item) => ({ title: item.title, subtitle: "Legal news", type: "News", status: statusLabel(item.status), updatedAt: item.updatedAt })),
  ].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime()).slice(0, 5).map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() }));

  response.json({ data: { counts: { users, activeUsers, newUsers, courses, publishedCourses, topics, publishedTopics, notes, publishedNotes, cases, publishedCases, statutes, publishedStatutes, drafts }, progress: [{ label: "Courses published", current: publishedCourses, total: courses }, { label: "Topics published", current: publishedTopics, total: topics }, { label: "Cases reviewed", current: publishedCases, total: cases }, { label: "Statutes indexed", current: publishedStatutes, total: statutes }], recentContent, attention: drafts ? [{ title: "Draft topics", detail: `${drafts} topic${drafts === 1 ? "" : "s"} awaiting review`, count: drafts }] : [], activity: [] } });
});

adminRouter.get("/courses", requireAuth, adminOnly, async (_request, response) => {
  const courses = await prisma.course.findMany({ orderBy: { title: "asc" }, include: { topics: { select: { id: true } }, enrollments: { select: { completedTopicIds: true } } } });
  response.json({ data: courses.map((course) => ({ id: course.id, code: course.code, title: course.title, academicYear: course.academicYear, semester: course.semester, status: statusLabel(course.status), topicCount: course.topics.length, enrollmentCount: course.enrollments.length, completionPercent: completion(course.topics, course.enrollments) })) });
});

const courseWithTopics = async (where: { id?: string; code?: string }) => prisma.course.findUnique({ where: where.id ? { id: where.id } : { code: where.code! }, include: { topics: { orderBy: { position: "asc" }, include: { sections: { select: { id: true } } } }, enrollments: { select: { completedTopicIds: true } } } });

adminRouter.get("/courses/by-code/:code", requireAuth, adminOnly, async (request, response) => {
  const code = typeof request.params.code === "string" ? request.params.code : "";
  const course = await courseWithTopics({ code });
  if (!course) { response.status(404).json({ error: "Course not found" }); return; }
  response.json({ data: { ...course, status: statusLabel(course.status), completionPercent: completion(course.topics, course.enrollments) } });
});

adminRouter.get("/courses/:id", requireAuth, adminOnly, async (request, response) => {
  const id = typeof request.params.id === "string" ? request.params.id : "";
  const course = await courseWithTopics({ id });
  if (!course) { response.status(404).json({ error: "Course not found" }); return; }
  response.json({ data: { ...course, status: statusLabel(course.status), completionPercent: completion(course.topics, course.enrollments) } });
});

adminRouter.get("/users", requireAuth, adminOnly, async (_request, response) => {
  const start = monthStart();
  const [users, total, active, newUsers] = await Promise.all([prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true } }), prisma.user.count(), prisma.user.count({ where: { isActive: true } }), prisma.user.count({ where: { createdAt: { gte: start } } })]);
  response.json({ data: { users, counts: { total, active, newUsers, pendingVerification: 0 } } });
});

adminRouter.get("/cases", requireAuth, adminOnly, async (_request, response) => {
  const [cases, statutes, publishedCases] = await Promise.all([prisma.legalCase.findMany({ orderBy: { updatedAt: "desc" }, include: { topic: { include: { course: { select: { title: true } } } } } }), prisma.statute.count(), prisma.legalCase.count({ where: { status: "PUBLISHED" } })]);
  response.json({ data: { cases, counts: { cases: cases.length, publishedCases, statutes, constitution: 0 } } });
});

adminRouter.get("/news", requireAuth, adminOnly, async (_request, response) => {
  const [articles, published, scheduled, drafts] = await Promise.all([prisma.newsArticle.findMany({ orderBy: { updatedAt: "desc" } }), prisma.newsArticle.count({ where: { status: "PUBLISHED" } }), prisma.newsArticle.count({ where: { status: "ARCHIVED" } }), prisma.newsArticle.count({ where: { status: "DRAFT" } })]);
  response.json({ data: { articles, counts: { published, scheduled, drafts }, sourceCount: articles.filter((article) => Boolean(article.sourceUrl)).length } });
});

adminRouter.get("/community", requireAuth, adminOnly, async (_request, response) => {
  const [activeThreads, replies, recentQuestions] = await Promise.all([prisma.question.count({ where: { isLocked: false } }), prisma.reply.count(), prisma.question.findMany({ orderBy: { updatedAt: "desc" }, take: 10, include: { course: { select: { title: true } }, author: { select: { fullName: true } } } })]);
  response.json({ data: { counts: { openReports: 0, activeThreads, replies }, reports: [], recentQuestions } });
});

adminRouter.get("/reports", requireAuth, adminOnly, async (_request, response) => {
  const [activeUsers, enrollments, courses, topics, notes, cases, statutes, articles, replies] = await Promise.all([prisma.user.count({ where: { isActive: true } }), prisma.enrollment.count(), prisma.course.findMany({ orderBy: { title: "asc" }, include: { topics: { select: { id: true } }, enrollments: { select: { completedTopicIds: true } } } }), prisma.topic.count({ where: { status: "PUBLISHED" } }), prisma.note.count({ where: { status: "PUBLISHED" } }), prisma.legalCase.count({ where: { status: "PUBLISHED" } }), prisma.statute.count({ where: { status: "PUBLISHED" } }), prisma.newsArticle.count({ where: { status: "PUBLISHED" } }), prisma.reply.count()]);
  const topCourses = courses.map((course) => ({ title: course.title, completionPercent: completion(course.topics, course.enrollments), enrollmentCount: course.enrollments.length })).sort((left, right) => right.completionPercent - left.completionPercent).slice(0, 5);
  const completionByYear = [...new Set(courses.map((course) => course.academicYear))].sort((left, right) => left - right).map((academicYear) => { const yearCourses = courses.filter((course) => course.academicYear === academicYear); const total = yearCourses.reduce((sum, course) => sum + course.topics.length * course.enrollments.length, 0); const completed = yearCourses.reduce((sum, course) => sum + Math.round((completion(course.topics, course.enrollments) / 100) * course.topics.length * course.enrollments.length), 0); return { label: `Year ${academicYear}`, value: total ? Math.round((completed / total) * 100) : 0 }; });
  response.json({ data: { metrics: { activeUsers, enrollments, completedTopics: courses.reduce((sum, course) => sum + course.enrollments.reduce((inner, enrollment) => inner + enrollment.completedTopicIds.length, 0), 0), replies }, contentTypes: { topics, notes, cases, statutes, articles }, topCourses, completionByYear, weeklyActivity: [], communityHealth: null } });
});
