"use client";

import { useParams } from "next/navigation";
import { CourseEditor } from "../CourseEditor";

export default function CourseDetails() {
  const params = useParams<{ courseId: string }>();
  return <CourseEditor courseId={params.courseId} />;
}
