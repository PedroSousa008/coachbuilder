import { redirect } from "next/navigation";

/** Legacy route: match video analysis was removed in favour of Sketch Area. */
export default function VideoRedirectPage() {
  redirect("/app/sketch");
}
