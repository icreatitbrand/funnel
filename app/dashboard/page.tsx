import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const metadata = {
  title: "Dashboard",
  description: "Unlock the Telegram group, track your referrals and claim rewards.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
