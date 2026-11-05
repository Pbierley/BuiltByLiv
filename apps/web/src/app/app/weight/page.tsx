import { WeightLog } from "@/components/weight-log";
import { getViewer, listWeighIns } from "@/lib/queries";

export const metadata = { title: "Body weight" };

export default async function WeightPage() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const entries = await listWeighIns(viewer);
  return <WeightLog entries={entries} unit={viewer.unit} />;
}
