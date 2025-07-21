import { NotificationButton } from "@/components/notification-button";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          {/* <NotificationButton /> */}
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            Welcome to your dashboard
          </h2>
          <p className="text-muted-foreground mb-4">
            Click the notification bell in the top right to see your
            notifications. New notifications will appear with a red dot
            indicator.
          </p>
        </div>
      </div>
    </div>
  );
}
