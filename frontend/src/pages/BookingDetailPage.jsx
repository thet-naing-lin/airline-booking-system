import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';

const ALLOWED_TRANSITIONS = {
  pending: ['deposite', 'cancelled'],
  deposite: ['pending', 'paid', 'refunded'],
  paid: ['deposite', 'travelled'],
  travelled: [],
  cancelled: [],
  refunded: ['cancelled'],
};

const STATUS_LABELS = {
  pending: 'Pending',
  deposite: 'Deposite',
  paid: 'Paid',
  travelled: 'Travelled',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-800',
  deposite: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  travelled: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-orange-100 text-orange-800',
};

export default function BookingDetailPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const [newStatus, setNewStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [pnr, setPnr] = useState('');
  const [updatingPnr, setUpdatingPnr] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      const response = await api.get(`/bookings/${id}`);
      setBooking(response.data.data);
      setPnr(response.data.data.pnr || '');
    } catch (err) {
      toast.error('Failed to load booking.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === booking.status) return;

    setUpdatingStatus(true);
    try {
      await api.patch(`/bookings/${id}/status`, { status: newStatus });
      setBooking((prev) => ({ ...prev, status: newStatus }));
      setNewStatus('');
      toast.success('Status updated!');
    } catch (err) {
      toast.error('Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePnrUpdate = async () => {
    setUpdatingPnr(true);
    try {
      const payload = {
        departure_location: booking.departure_location,
        destination: booking.destination,
        travel_date: booking.travel_date,
        travel_time: booking.travel_time || null,
        airline_name: booking.airline_name || null,
        flight_number: booking.flight_number || null,
        contact_name: booking.contact_name,
        contact_phone: booking.contact_phone,
        deposit_amount: booking.deposit_amount || null,
        total_amount: booking.total_amount || null,
        comment: booking.comment || null,
        passengers: booking.passengers.map((p) => ({
          id: p.id,
          full_name: p.full_name,
          nrc_number: p.nrc_number || null,
          date_of_birth: p.date_of_birth || null,
          phone_number: p.phone_number || null,
          passport_number: p.passport_number || null,
          ticket_number: p.ticket_number || null,
          seat_number: p.seat_number || null,
        })),
        pnr: pnr || null,
      };

      const response = await api.put(`/bookings/${id}`, payload);
      setBooking(response.data.data);
      toast.success('PNR updated!');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update PNR.';
      toast.error(message);
    } finally {
      setUpdatingPnr(false);
    }
  };

  const allowedTransitions = booking ? ALLOWED_TRANSITIONS[booking.status] || [] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading booking...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <Link to="/bookings" className="text-sm text-blue-600 hover:text-blue-800 mb-1 block">
            ← Back to bookings
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            {booking.booking_code}
          </h1>
        </div>
        <Link
          to={`/bookings/${id}/edit`}
          className="inline-flex items-center justify-center bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm font-medium"
        >
          Edit Booking
        </Link>
      </div>

      {/* Main content */}
      <div className="space-y-4 sm:space-y-6">
        {/* Status + PNR + Financial — stacked on mobile, sidebar on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left column — spans 2 on desktop */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Route & Schedule */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Route & Schedule</h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <DetailItem label="Departure" value={booking.departure_location} />
                <DetailItem label="Destination" value={booking.destination} />
                <DetailItem label="Travel Date" value={
                  booking.travel_date
                    ? (() => {
                        const [y, m, d] = booking.travel_date.split('-');
                        return y && m && d ? `${d}/${m}/${y}` : booking.travel_date;
                      })()
                    : '—'
                } />
                <DetailItem label="Travel Time" value={booking.travel_time || '—'} />
                <DetailItem label="Airline" value={booking.airline_name || '—'} />
                <DetailItem label="Flight Number" value={booking.flight_number || '—'} />
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Contact Person</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <DetailItem label="Name" value={booking.contact_name} />
                <DetailItem label="Phone" value={booking.contact_phone} />
              </div>
            </div>

            {/* Passengers */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
                Passengers <span className="text-gray-400 font-normal">{booking.passengers_count}</span>
              </h2>
              {booking.passengers.length === 0 ? (
                <p className="text-gray-500 text-sm">No passengers.</p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/4">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                          DOB
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                          Phone
                        </th>
                        <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                          NRC
                        </th>
                        <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                          Passport
                        </th>
                        <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                          Ticket
                        </th>
                        <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                          Seat
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {booking.passengers.map((passenger) => (
                        <tr key={passenger.id}>
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                            {passenger.full_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {passenger.date_of_birth
                              ? (() => {
                                  const [y, m, d] = passenger.date_of_birth.split('-');
                                  return y && m && d ? `${d}/${m}/${y}` : passenger.date_of_birth;
                                })()
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {passenger.phone_number || '—'}
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {passenger.nrc_number || '—'}
                          </td>
                          <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {passenger.passport_number || '—'}
                          </td>
                          <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {passenger.ticket_number || '—'}
                          </td>
                          <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {passenger.seat_number || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Comment */}
            {booking.comment && (
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">Comment</h2>
                <p className="text-sm text-gray-700">{booking.comment}</p>
              </div>
            )}
          </div>

          {/* Right column — sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Status */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Status</h2>
              <div className="mb-4">
                <span
                  className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${STATUS_STYLES[booking.status]}`}
                >
                  {STATUS_LABELS[booking.status]}
                </span>
              </div>

              {allowedTransitions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Change to:
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      {allowedTransitions.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleStatusUpdate}
                      disabled={!newStatus || updatingStatus}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {updatingStatus ? '...' : 'Update'}
                    </button>
                  </div>
                </div>
              )}

              {allowedTransitions.length === 0 && (
                <p className="text-sm text-gray-500">No changes available.</p>
              )}
            </div>

            {/* PNR */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">PNR</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  value={pnr}
                  onChange={(e) => setPnr(e.target.value)}
                  placeholder="Enter PNR..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handlePnrUpdate}
                  disabled={updatingPnr}
                  className="w-full px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
                >
                  {updatingPnr ? 'Saving...' : 'Save PNR'}
                </button>
              </div>
            </div>

            {/* Financial */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Financial</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Deposit</span>
                  <span className="font-medium text-gray-900">
                    {booking.deposit_amount ? Number(booking.deposit_amount).toLocaleString() : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total</span>
                  <span className="font-medium text-gray-900">
                    {booking.total_amount ? Number(booking.total_amount).toLocaleString() : '—'}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-medium text-gray-700">Balance</span>
                  <span className="font-bold text-gray-900">
                    {booking.total_amount && booking.deposit_amount
                      ? (Number(booking.total_amount) - Number(booking.deposit_amount)).toLocaleString()
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Created */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created by</span>
                  <span className="text-gray-900">{booking.creator?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created at</span>
                  <span className="text-gray-900">
                    {booking.created_at ? new Date(booking.created_at).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs sm:text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 mt-0.5">{value}</dd>
    </div>
  );
}
