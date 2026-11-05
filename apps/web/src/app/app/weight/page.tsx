import { WeightLog } from "@/components/weight-log";
import { member, weighIns } from "@/lib/content";

export const metadata = { title: "Body weight" };

export default function WeightPage() {
  return <WeightLog entries={weighIns} unit={member.units} />;
}
