import { TrainingPlansClient } from "./TrainingPlansClient";
import { mockSessions } from "@/data/mock";

export default function TrainingPage() {
  return <TrainingPlansClient sessions={mockSessions} />;
}
