"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Setup } from "./Setup";
import { Writer } from "./Writer";

// /content            -> start a new topic
// /content?course=id  -> start a new topic in that course
// /content?topic=id   -> write or edit that topic
function Route() {
  const params = useSearchParams();
  const topic = params.get("topic");
  return topic ? <Writer key={topic} topicId={topic} /> : <Setup presetCourse={params.get("course")} />;
}

export default function ContentManager() {
  return <Suspense fallback={null}><Route /></Suspense>;
}
