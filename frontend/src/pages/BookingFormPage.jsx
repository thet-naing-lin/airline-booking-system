import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';

const EMPTY_PASSENGER = {
  full_name: '',
  nrc_number: '',
  date_of_birth: '',
  phone_number: '',
  passport_number: '',
  ticket_number: '',
  seat_number: '',
};

const INITIAL_FORM = {
  pnr: '',
  departure_location: '',
  destination: '',
  travel_date: '',
  travel_time: '',
  airline_name: '',
  flight_number: '',
  contact_name: '',
  contact_phone: '',
  deposit_amount: '',
  total_amount: '',
  comment: '',
  passengers: [{ ...EMPTY_PASSENGER }],
};

export default function BookingFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (isEdit) {
      fetchBooking();
    }
  }, [id]);

  const fetchBooking = async () => {
    try {
      const response = await api.get(`/bookings/${id}`);
      const booking = response.data.data;

      setForm({
        pnr: booking.pnr || '',
        departure_location: booking.departure_location,
        destination: booking.destination,
        travel_date: booking.travel_date,
        travel_time: booking.travel_time || '',
        airline_name: booking.airline_name || '',
        flight_number: booking.flight_number || '',
        contact_name: booking.contact_name,
        contact_phone: booking.contact_phone,
        deposit_amount: booking.deposit_amount || '',
        total_amount: booking.total_amount || '',
        comment: booking.comment || '',
        passengers: booking.passengers.length > 0
          ? booking.passengers.map((p) => ({
              id: p.id,
              full_name: p.full_name,
              nrc_number: p.nrc_number || '',
              date_of_birth: p.date_of_birth || '',
              phone_number: p.phone_number || '',
              passport_number: p.passport_number || '',
              ticket_number: p.ticket_number || '',
              seat_number: p.seat_number || '',
            }))
          : [{ ...EMPTY_PASSENGER }],
      });
    } catch (error) {
      setServerError('Failed to load booking.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handlePassengerChange = (index, e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const passengers = [...prev.passengers];
      passengers[index] = { ...passengers[index], [name]: value };
      return { ...prev, passengers };
    });
    const errorKey = `passengers.${index}.${name}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const addPassenger = () => {
    setForm((prev) => ({
      ...prev,
      passengers: [...prev.passengers, { ...EMPTY_PASSENGER }],
    }));
  };

  const removePassenger = (index) => {
    if (form.passengers.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      passengers: prev.passengers.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setServerError('');
    setSaving(true);

    const payload = {
      ...form,
      pnr: form.pnr || null,
      travel_time: form.travel_time || null,
      airline_name: form.airline_name || null,
      flight_number: form.flight_number || null,
      deposit_amount: form.deposit_amount || null,
      total_amount: form.total_amount || null,
      comment: form.comment || null,
      passengers: form.passengers.map((p) => {
        const { id: _, ...rest } = p;
        return {
          ...rest,
          id: _ || undefined,
          nrc_number: rest.nrc_number || null,
          date_of_birth: rest.date_of_birth || null,
          phone_number: rest.phone_number || null,
          passport_number: rest.passport_number || null,
          ticket_number: rest.ticket_number || null,
          seat_number: rest.seat_number || null,
        };
      }),
    };

    // Remove undefined ids
    payload.passengers = payload.passengers.map((p) => {
      if (p.id === undefined) {
        const { id: _, ...rest } = p;
        return rest;
      }
      return p;
    });

    try {
      if (isEdit) {
        await api.put(`/bookings/${id}`, payload);
      } else {
        await api.post('/bookings', payload);
      }
      navigate('/bookings');
    } catch (error) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors || {});
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading booking...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">
        {isEdit ? 'Edit Booking' : 'New Booking'}
      </h1>

      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 sm:mb-6 text-sm">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Booking Fields */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Booking Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field
              label="Departure Location"
              name="departure_location"
              value={form.departure_location}
              onChange={handleChange}
              error={errors.departure_location}
              required
            />
            <Field
              label="Destination"
              name="destination"
              value={form.destination}
              onChange={handleChange}
              error={errors.destination}
              required
            />
            <Field
              label="Travel Date"
              name="travel_date"
              type="date"
              value={form.travel_date}
              onChange={handleChange}
              error={errors.travel_date}
              required
            />
            <Field
              label="Travel Time"
              name="travel_time"
              type="time"
              value={form.travel_time}
              onChange={handleChange}
              error={errors.travel_time}
            />
            <Field
              label="Airline Name"
              name="airline_name"
              value={form.airline_name}
              onChange={handleChange}
              error={errors.airline_name}
            />
            <Field
              label="Flight Number"
              name="flight_number"
              value={form.flight_number}
              onChange={handleChange}
              error={errors.flight_number}
            />
            <Field
              label="PNR"
              name="pnr"
              value={form.pnr}
              onChange={handleChange}
              error={errors.pnr}
            />
            <Field
              label="Contact Name"
              name="contact_name"
              value={form.contact_name}
              onChange={handleChange}
              error={errors.contact_name}
              required
            />
            <Field
              label="Contact Phone"
              name="contact_phone"
              value={form.contact_phone}
              onChange={handleChange}
              error={errors.contact_phone}
              required
            />
            <Field
              label="Deposit Amount"
              name="deposit_amount"
              type="number"
              value={form.deposit_amount}
              onChange={handleChange}
              error={errors.deposit_amount}
            />
            <Field
              label="Total Amount"
              name="total_amount"
              type="number"
              value={form.total_amount}
              onChange={handleChange}
              error={errors.total_amount}
            />
            <div className="sm:col-span-2">
              <Field
                label="Comment"
                name="comment"
                value={form.comment}
                onChange={handleChange}
                error={errors.comment}
              />
            </div>
          </div>
        </div>

        {/* Passengers */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">
              Passengers ({form.passengers.length})
            </h2>
            <button
              type="button"
              onClick={addPassenger}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + Add
            </button>
          </div>

          {form.passengers.length === 0 && (
            <p className="text-red-600 text-sm">At least one passenger is required.</p>
          )}

          <div className="space-y-3 sm:space-y-4">
            {form.passengers.map((passenger, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    Passenger {index + 1}
                  </h3>
                  {form.passengers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePassenger(index)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  <Field
                    label="Full Name"
                    name="full_name"
                    value={passenger.full_name}
                    onChange={(e) => handlePassengerChange(index, e)}
                    error={errors[`passengers.${index}.full_name`]}
                    required
                  />
                  <Field
                    label="NRC Number"
                    name="nrc_number"
                    value={passenger.nrc_number}
                    onChange={(e) => handlePassengerChange(index, e)}
                    error={errors[`passengers.${index}.nrc_number`]}
                  />
                  <Field
                    label="Date of Birth"
                    name="date_of_birth"
                    type="date"
                    value={passenger.date_of_birth}
                    onChange={(e) => handlePassengerChange(index, e)}
                    error={errors[`passengers.${index}.date_of_birth`]}
                  />
                  <Field
                    label="Phone"
                    name="phone_number"
                    value={passenger.phone_number}
                    onChange={(e) => handlePassengerChange(index, e)}
                    error={errors[`passengers.${index}.phone_number`]}
                  />
                  <Field
                    label="Passport"
                    name="passport_number"
                    value={passenger.passport_number}
                    onChange={(e) => handlePassengerChange(index, e)}
                    error={errors[`passengers.${index}.passport_number`]}
                  />
                  <Field
                    label="Ticket"
                    name="ticket_number"
                    value={passenger.ticket_number}
                    onChange={(e) => handlePassengerChange(index, e)}
                    error={errors[`passengers.${index}.ticket_number`]}
                  />
                  <Field
                    label="Seat"
                    name="seat_number"
                    value={passenger.seat_number}
                    onChange={(e) => handlePassengerChange(index, e)}
                    error={errors[`passengers.${index}.seat_number`]}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Booking' : 'Create Booking'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/bookings')}
            className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, type = 'text', value, onChange, error, required }) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600">{error[0]}</p>
      )}
    </div>
  );
}
