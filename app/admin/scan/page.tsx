'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Camera, CheckCircle2, AlertCircle, RefreshCw, 
  Package, Truck, ArrowLeft, Volume2, VolumeX, Sparkles
} from 'lucide-react';
import Link from 'next/link';

export default function MobileQrScannerPage() {
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMode, setScanMode] = useState<'AUTO' | 'PACKED' | 'SHIPPED'>('AUTO');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [scannedHistory, setScannedHistory] = useState<any[]>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-viewport';

  const playBeep = (type: 'success' | 'error') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime); // Low pitch A3
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // AudioContext fallback
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (processing) return;
    setProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/admin/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrCodeValue: decodedText,
          scanMode: scanMode,
          staffName: 'Mobile Scanner Agent'
        })
      });

      const data = await response.json();

      if (!data.success) {
        playBeep('error');
        setErrorMessage(data.message);
      } else {
        playBeep('success');
        setScanResult(data);
        setScannedHistory(prev => [data, ...prev.slice(0, 9)]);
      }
    } catch (err: any) {
      playBeep('error');
      setErrorMessage(err.message || 'Server communication error.');
    } finally {
      setTimeout(() => setProcessing(false), 1200); // 1.2s debounce to prevent duplicate reads
    }
  };

  const startCamera = async () => {
    try {
      setErrorMessage(null);
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Rear camera
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        handleScanSuccess,
        () => {} // Silent on non-match frames
      );
      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera init failed:', err);
      setErrorMessage('Camera access denied. Please grant camera permissions.');
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && isScanning) {
      await html5QrCodeRef.current.stop();
      html5QrCodeRef.current.clear();
      setIsScanning(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white font-sans flex flex-col justify-between">
      
      {/* Top Bar */}
      <div className="p-4 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="p-2 bg-gray-800 rounded-xl hover:bg-gray-700 text-gray-300">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-sm font-black tracking-wide flex items-center gap-1.5">
              <Camera size={16} className="text-orange-500" />
              Parcel Barcode Scanner
            </h1>
            <p className="text-[10px] text-gray-400">Scan packaging label QR to update status</p>
          </div>
        </div>

        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 bg-gray-800 rounded-xl text-gray-300 hover:text-white"
        >
          {soundEnabled ? <Volume2 size={16} className="text-green-400" /> : <VolumeX size={16} className="text-gray-500" />}
        </button>
      </div>

      {/* Mode Selector */}
      <div className="p-3 bg-gray-900 border-b border-gray-800 flex gap-2">
        <button
          onClick={() => setScanMode('AUTO')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
            scanMode === 'AUTO' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-800 text-gray-400'
          }`}
        >
          <Sparkles size={13} /> Auto-Advance
        </button>
        <button
          onClick={() => setScanMode('PACKED')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
            scanMode === 'PACKED' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-800 text-gray-400'
          }`}
        >
          <Package size={13} /> Mark Packed
        </button>
        <button
          onClick={() => setScanMode('SHIPPED')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
            scanMode === 'SHIPPED' ? 'bg-sky-600 text-white shadow-md' : 'bg-gray-800 text-gray-400'
          }`}
        >
          <Truck size={13} /> Handover / Ship
        </button>
      </div>

      {/* Camera Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div className="w-full max-w-sm rounded-3xl overflow-hidden border-2 border-dashed border-gray-700 bg-black relative shadow-2xl">
          <div id={scannerContainerId} className="w-full h-full min-h-[300px]" />
          
          {processing && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-2 text-orange-400 font-bold text-xs">
              <RefreshCw size={18} className="animate-spin" />
              <span>Processing Parcel QR...</span>
            </div>
          )}
        </div>

        {/* Scan Results / Alerts */}
        <div className="w-full max-w-sm mt-4 space-y-2">
          {errorMessage && (
            <div className="p-3.5 bg-red-950/80 border border-red-800 rounded-2xl text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {scanResult && (
            <div className="p-4 bg-gray-900 border-2 border-green-500/80 rounded-2xl space-y-2 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-green-400 flex items-center gap-1">
                  <CheckCircle2 size={15} /> {scanResult.orderNumber}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-950 text-green-300 border border-green-800">
                  {scanResult.newStatus}
                </span>
              </div>
              <p className="text-xs text-gray-300 font-medium">Customer: <b>{scanResult.customerName}</b></p>
              <div className="flex justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-800">
                <span>Items: {scanResult.itemCount}</span>
                <span>Total: ₹{scanResult.totalAmount}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Scans Strip */}
      {scannedHistory.length > 0 && (
        <div className="p-4 bg-gray-900 border-t border-gray-800 max-h-36 overflow-y-auto">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Recent Batch Scans</p>
          <div className="space-y-1.5">
            {scannedHistory.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs bg-gray-950/70 p-2 rounded-xl border border-gray-800">
                <span className="font-mono font-bold text-gray-300">{item.orderNumber}</span>
                <span className="text-[10px] font-bold text-orange-400">{item.newStatus}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </main>
  );
}