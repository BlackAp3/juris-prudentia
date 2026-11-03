import { redirect } from "next/navigation";

// Old hardcoded Criminal Law route. Courses are opened by id from /courses now.
export default function LegacyCourseEditor() {
  redirect("/courses");
}
