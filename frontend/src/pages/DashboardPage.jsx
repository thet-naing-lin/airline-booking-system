import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h1>
      <p className="text-gray-600">
        Welcome back, <span className="font-medium">{user?.name}</span>.
      </p>
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Booking list will be displayed here (Task 6).</p>
      </div>
    </div>
  );
}
