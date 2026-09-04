import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { SosAlert, RiskZone, PatrolUnit } from '../../types';

interface TacticalMapProps {
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
  filterMode?: 'all' | 'sos' | 'hazards' | 'patrols';
  sosAlerts?: SosAlert[];
  riskZones?: RiskZone[];
  patrolUnits?: PatrolUnit[];
  userLocation?: [number, number];
  onSelectSos?: (alert: SosAlert) => void;
  className?: string;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  center = [32.2472, 77.1852],
  zoom = 13,
  interactive = true,
  filterMode = 'all',
  sosAlerts = [],
  riskZones = [],
  patrolUnits = [],
  userLocation,
  onSelectSos,
  className = 'w-full h-full min-h-[400px]'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [center[0], center[1]] as L.LatLngTuple,
        zoom,
        zoomControl: false,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        attributionControl: false
      });

      // Add high-contrast, clean Carto Voyager tiles with licensed API key (removes watermark)
      const cartoKey = import.meta.env.VITE_CARTO_API_KEY || 'cb1_2wm6_1_9460d471a9546f931af3da0e';
      L.tileLayer(`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoKey}`, {
        maxZoom: 19,
      }).addTo(map);

      // Custom zoom control in bottom right
      if (interactive) {
        L.control.zoom({ position: 'bottomright' }).addTo(map);
      }

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
      setMapReady(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  // Update center if needed
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView(center, zoom, { animate: true });
    }
  }, [center[0], center[1], zoom]);

  // Render tactical GIS layers, risk zones, SOS markers, and patrols
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current || !mapReady) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    // 1. Render Risk Zones (Polygons)
    if (filterMode === 'all' || filterMode === 'hazards') {
      riskZones.forEach((zone) => {
        const isHigh = zone.riskLevel === 'high';
        const isMedium = zone.riskLevel === 'medium';
        const isAi = zone.source === 'ai_suggested';

        const color = isHigh ? '#D64545' : isMedium ? '#F2A541' : '#3FA34D';
        const fillColor = color;
        const fillOpacity = isAi ? 0.22 : isHigh ? 0.28 : isMedium ? 0.2 : 0.15;
        const dashArray = isAi ? '6, 6' : undefined;

        const polygon = L.polygon(zone.coordinates, {
          color,
          weight: isAi ? 2.5 : 2,
          fillColor,
          fillOpacity,
          dashArray,
          className: isAi ? 'ai-geofence-polygon' : ''
        });

        // Interactive popup
        polygon.bindPopup(`
          <div style="font-family: 'Manrope', sans-serif; min-width: 220px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${color}; letter-spacing: 0.5px;">
                ${isAi ? '⚡ AI-Flagged Ravine Alert' : zone.riskLevel.toUpperCase() + ' RISK GEOFENCE'}
              </span>
              <span style="font-size: 11px; font-weight: 700; color: #5C6B78;">${zone.activeTouristsCount} Tourists</span>
            </div>
            <h4 style="font-size: 14px; font-weight: 800; margin: 0 0 4px 0; color: #0B3D62;">${zone.name}</h4>
            <p style="font-size: 12px; line-height: 1.4; color: #1A2530; margin: 0 0 6px 0;">${zone.advisoryText}</p>
            <div style="font-size: 10px; color: #5C6B78; border-top: 1px solid #E8EDF2; padding-top: 4px;">
              Source: ${isAi ? `INSAT Telemetry (Confidence: ${zone.confidenceScore}%)` : 'Municipal Authority'}
            </div>
          </div>
        `);

        polygon.addTo(layerGroup);
      });
    }

    // 2. Render SOS Distress Markers
    if (filterMode === 'all' || filterMode === 'sos') {
      sosAlerts.forEach((alert) => {
        if (alert.status === 'resolved' || alert.status === 'cancelled') return;

        const isCritical = alert.severity === 'critical';
        const sosIconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group" style="width: 44px; height: 44px;">
            <div class="absolute w-11 h-11 rounded-full ${isCritical ? 'bg-red-500/30 animate-ping' : 'bg-amber-500/30 animate-pulse'}"></div>
            <div class="relative w-8 h-8 rounded-full ${isCritical ? 'bg-[#D64545]' : 'bg-[#F2A541]'} text-white flex items-center justify-center font-extrabold text-[12px] shadow-lg border-2 border-white">
              SOS
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: sosIconHtml,
          className: 'custom-sos-marker',
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        });

        const marker = L.marker([alert.location.lat, alert.location.lng], { icon });

        marker.on('click', () => {
          if (onSelectSos) onSelectSos(alert);
        });

        marker.bindPopup(`
          <div style="font-family: 'Manrope', sans-serif; min-width: 240px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="background: ${isCritical ? '#D64545' : '#F2A541'}; color: white; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
                ${alert.severity} • ${alert.status}
              </span>
              <span style="font-size: 11px; font-weight: 600; color: #5C6B78;">#${alert.touristId}</span>
            </div>
            <h4 style="font-size: 15px; font-weight: 800; margin: 0 0 4px 0; color: #1A2530;">${alert.touristName}</h4>
            <p style="font-size: 12px; color: #5C6B78; margin: 0 0 6px 0;"><strong>Location:</strong> ${alert.location.address || 'Coordinates locked'}</p>
            <div style="display: flex; justify-content: space-between; font-size: 11px; background: #F4F7FA; padding: 6px; border-radius: 6px;">
              <span><strong>Alt:</strong> ${alert.altitudeM}m</span>
              <span><strong>Bat:</strong> ${alert.batteryLevel}%</span>
              <span><strong>Pulse:</strong> ${alert.pulseBpm || 110} bpm</span>
            </div>
          </div>
        `);

        marker.addTo(layerGroup);
      });
    }

    // 3. Render Field Patrol Units
    if (filterMode === 'all' || filterMode === 'patrols') {
      patrolUnits.forEach((unit) => {
        const isDispatched = unit.status === 'dispatched';
        const patrolHtml = `
          <div class="relative flex items-center justify-center" style="width: 38px; height: 38px;">
            <div class="w-8 h-8 rounded-full bg-[#0B3D62] text-white flex items-center justify-center font-bold text-[11px] shadow-md border-2 border-white">
              ${unit.callsign}
            </div>
            ${isDispatched ? '<div class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></div>' : ''}
          </div>
        `;

        const icon = L.divIcon({
          html: patrolHtml,
          className: 'custom-patrol-marker',
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        });

        const marker = L.marker(unit.location, { icon });
        marker.bindPopup(`
          <div style="font-family: 'Manrope', sans-serif; min-width: 200px; padding: 4px;">
            <span style="font-size: 10px; font-weight: 700; color: #1C7293; text-transform: uppercase;">Field Patrol Unit</span>
            <h4 style="font-size: 14px; font-weight: 800; margin: 2px 0; color: #0B3D62;">${unit.name}</h4>
            <p style="font-size: 12px; color: #5C6B78; margin: 0 0 6px 0;"><strong>Sector:</strong> ${unit.sector}</p>
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #1A2530;">
              <span><strong>Status:</strong> ${unit.status}</span>
              <span><strong>Speed:</strong> ${unit.currentSpeedKmH} km/h</span>
            </div>
          </div>
        `);
        marker.addTo(layerGroup);
      });
    }

    // 4. Render Tourist Self Location Marker
    if (userLocation) {
      const userHtml = `
        <div class="relative flex items-center justify-center" style="width: 32px; height: 32px;">
          <div class="absolute w-8 h-8 rounded-full bg-[#1C7293]/30 animate-ping"></div>
          <div class="relative w-5 h-5 rounded-full bg-[#1C7293] border-2 border-white shadow-md"></div>
        </div>
      `;

      const icon = L.divIcon({
        html: userHtml,
        className: 'custom-user-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const userMarker = L.marker(userLocation, { icon });
      userMarker.bindPopup(`
        <div style="font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 700; color: #0B3D62;">
          📍 Your Current Real-Time Location
        </div>
      `);
      userMarker.addTo(layerGroup);
    }
  }, [mapReady, filterMode, sosAlerts, riskZones, patrolUnits, userLocation, onSelectSos]);

  return (
    <div className={`relative rounded-xl overflow-hidden shadow-sm ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
