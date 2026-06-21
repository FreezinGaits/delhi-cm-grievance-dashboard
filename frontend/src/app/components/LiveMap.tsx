'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCw, MapPin, X } from 'lucide-react';

// Types
interface MapComplaint {
  lat: number;
  lng: number;
  category: string;
  priority: string;
  status: string;
  isCritical: boolean;
  title: string;
  referenceNumber: string;
  _id?: string;
}

interface NearbyComplaint {
  _id: string;
  referenceNumber: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  isCritical: boolean;
  location: { coordinates: [number, number] };
  address?: { ward?: string };
  assignedDepartment?: { name: string; code: string };
  assignedOfficer?: { name: { first: string; last: string } };
}

interface LiveMapProps {
  apiUrl: string;
  token: string;
}

const DELHI_CENTER: [number, number] = [28.6139, 77.2090];
const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  normal: '#3b82f6',
  low: '#6b7280',
};

export default function LiveMap({ apiUrl, token }: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const nearbyLayerRef = useRef<any>(null);
  const radiusCircleRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  const [heatmapData, setHeatmapData] = useState<MapComplaint[]>([]);
  const [nearbyComplaints, setNearbyComplaints] = useState<NearbyComplaint[]>([]);
  const [fieldVisitMode, setFieldVisitMode] = useState(false);
  const [fieldRadius, setFieldRadius] = useState(1000);
  const [cmPosition, setCmPosition] = useState<[number, number] | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [markingCritical, setMarkingCritical] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch heatmap data from backend
  const fetchHeatmapData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`${apiUrl}/api/v1/cm/heatmap?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setHeatmapData(data.data || []);
    } catch (err) {
      console.error('Failed to fetch heatmap data:', err);
    }
  }, [apiUrl, token, categoryFilter, statusFilter]);

  // Fetch nearby complaints for field visit mode
  const fetchNearbyComplaints = useCallback(async (lat: number, lng: number, radius: number) => {
    try {
      const res = await fetch(
        `${apiUrl}/api/v1/cm/nearby-complaints?lat=${lat}&lng=${lng}&radius=${radius}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) setNearbyComplaints(data.data || []);
    } catch (err) {
      console.error('Failed to fetch nearby complaints:', err);
    }
  }, [apiUrl, token]);

  // Mark complaint as critical
  const markAsCritical = async (complaintId: string) => {
    setMarkingCritical(complaintId);
    try {
      await fetch(`${apiUrl}/api/v1/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'escalated', notes: 'Escalated to Critical by CM during field visit / map review' }),
      });
      // Refresh data
      fetchHeatmapData();
      if (cmPosition) fetchNearbyComplaints(cmPosition[0], cmPosition[1], fieldRadius);
    } catch (err) {
      console.error('Failed to mark as critical:', err);
    } finally {
      setMarkingCritical(null);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      if (cancelled) return;

      LRef.current = L;

      const map = L.map(mapContainerRef.current!, {
        center: DELHI_CENTER,
        zoom: 12,
        zoomControl: true,
        attributionControl: true,
      });

      // Dark tile layer for premium look
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      nearbyLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Fetch heatmap data
  useEffect(() => {
    if (mapReady) fetchHeatmapData();
  }, [mapReady, fetchHeatmapData]);

  // Render heatmap markers
  useEffect(() => {
    if (!mapReady || !LRef.current || !markersLayerRef.current) return;
    const L = LRef.current;
    markersLayerRef.current.clearLayers();

    heatmapData.forEach((point) => {
      const color = point.isCritical ? '#ef4444' : (PRIORITY_COLORS[point.priority] || '#3b82f6');
      const pulseClass = point.isCritical ? 'critical-pulse' : '';
      const size = point.isCritical ? 14 : 10;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="${pulseClass}" style="
          width:${size}px; height:${size}px; border-radius:50%;
          background:${color}; box-shadow:0 0 ${point.isCritical ? 16 : 8}px ${color};
          border:2px solid rgba(255,255,255,0.4);
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([point.lat, point.lng], { icon });

      const popupContent = `
        <div style="font-family:'Inter',sans-serif; min-width:220px; color:#e2e8f0;">
          <div style="font-weight:700; font-size:13px; margin-bottom:6px; color:#f1f5f9;">${point.title}</div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
            <span style="background:${color}22; color:${color}; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600;">${point.priority.toUpperCase()}</span>
            <span style="background:#1e293b; padding:2px 8px; border-radius:4px; font-size:11px;">${point.category}</span>
            <span style="background:#1e293b; padding:2px 8px; border-radius:4px; font-size:11px;">${point.status.replace(/_/g, ' ')}</span>
          </div>
          <div style="font-size:11px; color:#94a3b8; margin-bottom:8px;">REF: ${point.referenceNumber}</div>
          ${point._id && !point.isCritical ? `<button onclick="window.__markCritical('${point._id}')" style="
            background:linear-gradient(135deg,#ef4444,#dc2626); color:white; border:none;
            padding:6px 14px; border-radius:6px; font-size:11px; font-weight:600;
            cursor:pointer; width:100%;
          ">🚨 Escalate to Critical</button>` : ''}
          ${point.isCritical ? '<div style="color:#fca5a5; font-size:11px; font-weight:600;">⚠️ Already Critical</div>' : ''}
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'dark-popup',
        maxWidth: 280,
      });

      markersLayerRef.current.addLayer(marker);
    });
  }, [heatmapData, mapReady]);

  // Field Visit Mode: GPS + radius circle + nearby complaints
  useEffect(() => {
    if (!mapReady || !LRef.current) return;
    const L = LRef.current;

    // Clear previous nearby layer
    if (nearbyLayerRef.current) nearbyLayerRef.current.clearLayers();
    if (radiusCircleRef.current) {
      mapInstanceRef.current.removeLayer(radiusCircleRef.current);
      radiusCircleRef.current = null;
    }

    if (!fieldVisitMode || !cmPosition) return;

    // Draw radius circle
    radiusCircleRef.current = L.circle(cmPosition, {
      radius: fieldRadius,
      color: '#06b6d4',
      fillColor: '#06b6d4',
      fillOpacity: 0.08,
      weight: 2,
      dashArray: '8 4',
    }).addTo(mapInstanceRef.current);

    // CM position marker
    const cmIcon = L.divIcon({
      className: 'cm-marker',
      html: `<div style="
        width:20px; height:20px; border-radius:50%;
        background:linear-gradient(135deg,#06b6d4,#0ea5e9);
        box-shadow:0 0 20px #06b6d4; border:3px solid white;
        display:flex; align-items:center; justify-content:center;
        font-size:10px;
      ">📍</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    L.marker(cmPosition, { icon: cmIcon })
      .bindPopup('<div style="color:#e2e8f0;font-weight:700;">📍 Your Location</div>', { className: 'dark-popup' })
      .addTo(nearbyLayerRef.current!);

    // Render nearby complaint markers
    nearbyComplaints.forEach((c) => {
      const lat = c.location.coordinates[1];
      const lng = c.location.coordinates[0];
      const color = c.isCritical ? '#ef4444' : (PRIORITY_COLORS[c.priority] || '#3b82f6');

      const icon = L.divIcon({
        className: 'nearby-marker',
        html: `<div style="
          width:12px; height:12px; border-radius:50%;
          background:${color}; box-shadow:0 0 12px ${color};
          border:2px solid #06b6d4;
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const officerName = c.assignedOfficer ? `${c.assignedOfficer.name?.first || ''} ${c.assignedOfficer.name?.last || ''}`.trim() : 'Unassigned';

      const popup = `
        <div style="font-family:'Inter',sans-serif; min-width:240px; color:#e2e8f0;">
          <div style="font-weight:700; font-size:13px; margin-bottom:4px;">${c.title}</div>
          <div style="font-size:11px; color:#94a3b8; margin-bottom:6px;">${c.description?.slice(0, 100) || ''}...</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:11px; margin-bottom:8px;">
            <span>📋 ${c.category}</span>
            <span>📍 ${c.address?.ward || 'N/A'}</span>
            <span>🏢 ${c.assignedDepartment?.code || 'N/A'}</span>
            <span>👤 ${officerName}</span>
          </div>
          <div style="display:flex; gap:6px; margin-bottom:8px;">
            <span style="background:${color}22; color:${color}; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600;">${c.priority.toUpperCase()}</span>
            <span style="background:#1e293b; padding:2px 8px; border-radius:4px; font-size:11px;">${c.status.replace(/_/g, ' ')}</span>
          </div>
          ${!c.isCritical ? `<button onclick="window.__markCritical('${c._id}')" style="
            background:linear-gradient(135deg,#ef4444,#dc2626); color:white; border:none;
            padding:6px 14px; border-radius:6px; font-size:11px; font-weight:600;
            cursor:pointer; width:100%;
          ">🚨 Escalate to Critical</button>` : '<div style="color:#fca5a5;font-size:11px;font-weight:600;">⚠️ Already Critical</div>'}
        </div>
      `;

      L.marker([lat, lng], { icon })
        .bindPopup(popup, { className: 'dark-popup', maxWidth: 300 })
        .addTo(nearbyLayerRef.current!);
    });

    // Fit map to radius
    mapInstanceRef.current.fitBounds(radiusCircleRef.current.getBounds(), { padding: [30, 30] });
  }, [fieldVisitMode, cmPosition, nearbyComplaints, fieldRadius, mapReady]);

  // Global callback for popup buttons
  useEffect(() => {
    (window as any).__markCritical = (id: string) => markAsCritical(id);
    return () => { delete (window as any).__markCritical; };
  }, [token, apiUrl, cmPosition, fieldRadius]);

  // Activate field visit mode
  const activateFieldVisit = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setFieldVisitMode(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCmPosition([lat, lng]);
        fetchNearbyComplaints(lat, lng, fieldRadius);
      },
      (err) => {
        console.warn('Geolocation failed, using Delhi center:', err);
        // Fallback to Delhi center for development
        setCmPosition(DELHI_CENTER);
        fetchNearbyComplaints(DELHI_CENTER[0], DELHI_CENTER[1], fieldRadius);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const deactivateFieldVisit = () => {
    setFieldVisitMode(false);
    setCmPosition(null);
    setNearbyComplaints([]);
    if (nearbyLayerRef.current) nearbyLayerRef.current.clearLayers();
    if (radiusCircleRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(radiusCircleRef.current);
      radiusCircleRef.current = null;
    }
    mapInstanceRef.current?.setView(DELHI_CENTER, 12);
  };

  const updateRadius = (newRadius: number) => {
    setFieldRadius(newRadius);
    if (cmPosition) fetchNearbyComplaints(cmPosition[0], cmPosition[1], newRadius);
  };

  // Stats
  const totalPoints = heatmapData.length;
  const criticalCount = heatmapData.filter(p => p.isCritical).length;
  const unresolvedCount = heatmapData.filter(p => !['resolved', 'closed'].includes(p.status)).length;

  return (
    <div className="glass-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{
        padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '12px',
        background: 'var(--bg-secondary)',
      }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '2px' }}>🗺️ Live Incident Map — NCT Delhi</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            {totalPoints} incidents plotted • {criticalCount} critical • {unresolvedCount} unresolved
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Filters */}
          <select
            className="input"
            style={{ padding: '6px 10px', fontSize: '0.75rem', minWidth: '120px', height: '36px' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="Water Supply">Water Supply</option>
            <option value="Roads">Roads</option>
            <option value="Sanitation">Sanitation</option>
            <option value="Electricity">Electricity</option>
            <option value="Law & Order">Law & Order</option>
          </select>
          <select
            className="input"
            style={{ padding: '6px 10px', fontSize: '0.75rem', minWidth: '110px', height: '36px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="escalated">Escalated</option>
          </select>

          {/* Field Visit Toggle */}
          {!fieldVisitMode ? (
            <button
              onClick={activateFieldVisit}
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
                color: 'white', border: 'none', padding: '0 16px',
                borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                height: '36px', whiteSpace: 'nowrap',
              }}
            >
              <MapPin size={14} /> Field Visit Mode
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <select
                className="input"
                style={{ padding: '6px 10px', fontSize: '0.75rem', height: '36px' }}
                value={fieldRadius}
                onChange={(e) => updateRadius(parseInt(e.target.value))}
              >
                <option value={500}>500m</option>
                <option value={1000}>1 km</option>
                <option value={2000}>2 km</option>
                <option value={5000}>5 km</option>
              </select>
              <button
                onClick={deactivateFieldVisit}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5',
                  border: '1px solid rgba(239,68,68,0.3)', padding: '0 14px',
                  borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  height: '36px', whiteSpace: 'nowrap',
                }}
              >
                <X size={14} /> Exit Field Mode
              </button>
            </div>
          )}
          <button 
            onClick={fetchHeatmapData} 
            className="btn btn-ghost" 
            style={{ 
              padding: '0 12px', 
              fontSize: '0.75rem',
              height: '36px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Refresh map data"
          >
            <RotateCw size={14} />
          </button>
        </div>
      </div>

      {/* Field Visit Summary Bar */}
      {fieldVisitMode && (
        <div style={{
          padding: '10px 20px', background: 'rgba(6, 182, 212, 0.08)',
          borderBottom: '1px solid rgba(6, 182, 212, 0.2)',
          display: 'flex', gap: '20px', alignItems: 'center', fontSize: '0.8rem',
        }}>
          <span style={{ color: '#06b6d4', fontWeight: 700 }}>📍 Field Visit Active</span>
          <span>Radius: <strong>{fieldRadius >= 1000 ? `${fieldRadius/1000}km` : `${fieldRadius}m`}</strong></span>
          <span>Nearby Issues: <strong style={{ color: nearbyComplaints.length > 0 ? '#fbbf24' : '#6ee7b7' }}>{nearbyComplaints.length}</strong></span>
          {cmPosition && <span style={{ color: 'var(--text-muted)' }}>Lat: {cmPosition[0].toFixed(4)}, Lng: {cmPosition[1].toFixed(4)}</span>}
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainerRef} style={{ height: 'clamp(350px, 55vh, 520px)', width: '100%' }} />

      {/* Legend */}
      <div style={{
        padding: '12px 20px', borderTop: '1px solid var(--border-color)',
        display: 'flex', gap: '16px', fontSize: '0.75rem', flexWrap: 'wrap',
        background: 'var(--bg-secondary)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444', display: 'inline-block' }} /> Critical
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f97316', display: 'inline-block' }} /> High
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} /> Normal
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#6b7280', display: 'inline-block' }} /> Low
        </span>
        {fieldVisitMode && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#06b6d4' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#06b6d4', border: '2px solid white', display: 'inline-block' }} /> CM Position
          </span>
        )}
      </div>
    </div>
  );
}
