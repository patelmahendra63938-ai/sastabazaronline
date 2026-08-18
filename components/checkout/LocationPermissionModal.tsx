'use client';

import React, { useState } from 'react';
import { MapPin, Navigation, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react';

export interface LocationResult {
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelected: (loc: LocationResult) => void;
}

export default function LocationPermissionModal({ isOpen, onClose, onLocationSelected }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detectedLocation, setDetectedLocation] = useState<LocationResult | null>(null);

  if (!isOpen) return null;

  const requestBrowserLocation = () => {
    setErrorMsg(null);
    setLoading(true);

    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // One-time reverse geocode via OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );

          if (!res.ok) throw new Error('Reverse geocoding failed');
          const data = await res.json();

          const addr = data.address || {};
          const detectedCity = addr.city || addr.town || addr.district || addr.state_district || 'Surat';
          const detectedState = addr.state || 'Gujarat';
          const detectedPincode = addr.postcode || '';
          const fullStreet = [
            addr.road || addr.neighbourhood || addr.suburb,
            addr.residential || addr.industrial
          ].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || 'Current Location Area';

          setDetectedLocation({
            address: fullStreet,
            city: detectedCity,
            state: detectedState,
            pincode: detectedPincode,
            latitude,
            longitude,
          });
        } catch (err) {
          // Fallback if reverse geocode is slow/blocked
          setDetectedLocation({
            address: `Area near GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            city: 'Surat',
            state: 'Gujarat',
            pincode: '395006',
            latitude,
            longitude,
          });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMsg('Location access was denied. You can enter your delivery address manually below.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setErrorMsg('GPS location is currently unavailable on your device.');
        } else if (error.code === error.TIMEOUT) {
          setErrorMsg('Location request timed out. Please enter your address manually.');
        } else {
          setErrorMsg('Could not detect location. Please type your delivery address.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleConfirmDetected = () => {
    if (detectedLocation) {
      onLocationSelected(detectedLocation);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close location prompt"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
            <MapPin size={22} />
          </div>
          <div>
            <h3 id="modal-title" className="text-base font-black text-indigo-950">
              Use your current location?
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Allow location access to help us auto-fill your delivery area
            </p>
          </div>
        </div>

        {/* State 1: Error Notification */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Notice</p>
              <p className="text-[11px] text-red-600 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* State 2: Location Detected -> Confirmation Card */}
        {detectedLocation ? (
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
              <CheckCircle2 size={16} className="text-green-600" />
              <span>Is this your delivery location?</span>
            </div>

            <div className="text-xs text-gray-700 bg-white p-3 rounded-xl border border-indigo-50 shadow-xs space-y-0.5">
              <p className="font-semibold text-gray-900">{detectedLocation.address}</p>
              <p className="text-gray-500">{detectedLocation.city}, {detectedLocation.state} - {detectedLocation.pincode}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmDetected}
                className="bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-xs transition text-center"
              >
                Use This Location
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold py-2.5 px-3 rounded-xl transition text-center"
              >
                Edit Manually
              </button>
            </div>
          </div>
        ) : (
          /* State 3: Initial Benefits List */
          <div className="space-y-2.5 bg-gray-50/80 p-4 rounded-2xl border border-gray-100 text-xs text-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Find your approximate current location</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Help select the correct delivery area & pincode</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Make checkout faster and error-free</span>
            </div>
          </div>
        )}

        {/* Footer Action Buttons */}
        {!detectedLocation && (
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={requestBrowserLocation}
              disabled={loading}
              className="flex-1 bg-indigo-950 hover:bg-indigo-900 text-white font-bold py-3 rounded-xl transition text-xs shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={15} />}
              {loading ? 'Detecting Location...' : 'Allow Location'}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition text-xs font-bold"
            >
              Enter Manually
            </button>
          </div>
        )}
      </div>
    </div>
  );
}