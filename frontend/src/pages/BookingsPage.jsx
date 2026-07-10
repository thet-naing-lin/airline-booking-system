import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'deposite', label: 'Deposite' },
  { value: 'paid', label: 'Paid' },
  { value: 'travelled', label: 'Travelled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-800',
  deposite: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  travelled: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-orange-100 text-orange-800',
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [page, status, travelDate]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 20 };
      if (search) params.search = search;
      if (status) params.status = status;
      if (travelDate) params.travel_date = travelDate;

      const response = await api.get('/bookings', { params });
      setBookings(response.data.data);
      setPagination({
        current_page: response.data.meta?.current_page ?? 1,
        last_page: response.data.meta?.last_page ?? 1,
        per_page: response.data.meta?.per_page ?? 20,
        total: response.data.meta?.total ?? 0,
      });
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchBookings();
  };

  const handleReset = () => {
    setSearch('');
    setStatus('');
    setTravelDate('');
    setPage(1);
  };

  const hasActiveFilters = status || travelDate;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Bookings</h1>
        <Link
          to="/bookings/new"
          className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          + New
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-4 sm:mb-6">
        {/* Mobile: collapsible filters */}
        <div className="sm:hidden">
          <form onSubmit={handleSearch} className="p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-gray-800 text-white rounded-md text-sm font-medium"
              >
                Go
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-2 border rounded-md text-sm font-medium ${hasActiveFilters ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'}`}
              >
                Filter
              </button>
            </div>
          </form>

          {showFilters && (
            <div className="px-3 pb-3 border-t border-gray-200 pt-3 space-y-3">
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <input
                type="date"
                value={travelDate}
                onChange={(e) => { setTravelDate(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              {(status || travelDate) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Desktop: inline filters */}
        <form onSubmit={handleSearch} className="hidden sm:flex flex-wrap gap-3 items-end p-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Booking code, PNR, name, phone..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Travel Date</label>
            <input
              type="date"
              value={travelDate}
              onChange={(e) => { setTravelDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700">
              Search
            </button>
            <button type="button" onClick={handleReset} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No bookings found.</div>
        ) : (
          <>
            {/* Mobile: card view */}
            <div className="sm:hidden divide-y divide-gray-200">
              {bookings.map((booking) => (
                <Link
                  key={booking.id}
                  to={`/bookings/${booking.id}`}
                  className="block p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-medium text-blue-600">{booking.booking_code}</div>
                      <div className="text-xs text-gray-500">{booking.travel_date}</div>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_STYLES[booking.status]}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 mb-1">
                    {booking.departure_location} → {booking.destination}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{booking.contact_name}</span>
                    <span>{booking.passengers_count} pax</span>
                  </div>
                  {booking.pnr && (
                    <div className="text-xs text-gray-400 mt-1">PNR: {booking.pnr}</div>
                  )}
                </Link>
              ))}
            </div>

            {/* Desktop: table view */}
            <table className="hidden sm:table min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pax</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PNR</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link to={`/bookings/${booking.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                        {booking.booking_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {booking.departure_location} → {booking.destination}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {booking.travel_date}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      <div>{booking.contact_name}</div>
                      <div className="text-xs text-gray-500">{booking.contact_phone}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center">
                      {booking.passengers_count}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[booking.status]}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {booking.pnr || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                      <Link to={`/bookings/${booking.id}/edit`} className="text-blue-600 hover:text-blue-800 font-medium">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-sm text-gray-700">
                {pagination.total} booking{pagination.total !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span className="text-sm text-gray-700">
                  {pagination.current_page}/{pagination.last_page}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.last_page}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
