import { AccountPanel } from "@/components/account-panel";
import { getViewer, listOwnMessages } from "@/lib/queries";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const messages = await listOwnMessages(viewer);
  return <AccountPanel viewer={viewer} messages={messages} />;
}
