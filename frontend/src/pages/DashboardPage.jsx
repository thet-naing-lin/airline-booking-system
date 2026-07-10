import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    deposite: 0,
    paid: 0,
    travelled: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/bookings', { params: { per_page: 100 } });
      const bookings = response.data.data;
      const total = response.data.meta?.total ?? bookings.length;

      setStats({
        total,
        pending: bookings.filter((b) => b.status === 'pending').length,
        deposite: bookings.filter((b) => b.status === 'deposite').length,
        paid: bookings.filter((b) => b.status === 'paid').length,
        travelled: bookings.filter((b) => b.status === 'travelled').length,
      });

      setRecentBookings(bookings.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_STYLES = {
    pending: 'bg-gray-100 text-gray-800',
    deposite: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    travelled: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-orange-100 text-orange-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">
        Welcome back, {user?.name}
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard label="Total" value={stats.total} color="bg-blue-500" />
        <StatCard label="Pending" value={stats.pending} color="bg-gray-400" />
        <StatCard label="Deposite" value={stats.deposite} color="bg-yellow-500" />
        <StatCard label="Paid" value={stats.paid} color="bg-green-500" />
        <StatCard label="Travelled" value={stats.travelled} color="bg-blue-600" />
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">Recent Bookings</h2>
          <Link to="/bookings" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all →
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            No bookings yet.{' '}
            <Link to="/bookings/new" className="text-blue-600 hover:text-blue-800">
              Create your first booking
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile: card view */}
            <div className="sm:hidden divide-y divide-gray-200">
              {recentBookings.map((booking) => (
                <Link
                  key={booking.id}
                  to={`/bookings/${booking.id}`}
                  className="block p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-blue-600">{booking.booking_code}</span>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_STYLES[booking.status]}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700">
                    {booking.departure_location} → {booking.destination}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {booking.travel_date} · {booking.passengers_count} pax
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop: table view */}
            <table className="hidden sm:table min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pax</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <Link to={`/bookings/${booking.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                        {booking.booking_code}
                      </Link>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {booking.departure_location} → {booking.destination}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {booking.travel_date}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                      {booking.passengers_count}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[booking.status]}`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-6">
      <div className="flex items-center">
        <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${color} mr-2 sm:mr-3`}></div>
        <span className="text-xs sm:text-sm text-gray-600">{label}</span>
      </div>
      <div className="mt-1.5 sm:mt-2 text-xl sm:text-3xl font-bold text-gray-800">{value}</div>
    </div>
  );
}
