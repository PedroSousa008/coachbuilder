import { TacticsBoard } from "./TacticsBoard";
import { mockTactics } from "@/data/mock";

export default function TacticsPage() {
  return <TacticsBoard initialTactics={mockTactics} />;
}
