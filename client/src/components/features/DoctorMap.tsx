import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { StarRating } from '@/components/ui/star-rating';
import { cn } from '@/lib/utils';
import type { Doctor } from '@/types';

// Custom teardrop pin so we don't depend on Leaflet's bundled marker images
function pinIcon(color: string) {
  return L.divIcon({
    className: 'border-0 bg-transparent',
    html: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="${color}"/>
      <circle cx="15" cy="15" r="6" fill="white"/>
    </svg>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -38],
  });
}

const doctorIcon = pinIcon('#0b74c4');
const userIcon = pinIcon('#e8556d');

// Fits the map viewport to all visible points
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(points, { padding: [50, 50], maxZoom: 13 });
  }, [map, points]);
  return null;
}

interface DoctorMapProps {
  doctors: Doctor[];
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
}

export function DoctorMap({ doctors, userLocation, className }: DoctorMapProps) {
  const located = useMemo(
    () => doctors.filter(d => d.lat != null && d.lng != null),
    [doctors]
  );

  const points = useMemo(() => {
    const pts = located.map(d => [d.lat as number, d.lng as number] as [number, number]);
    if (userLocation) pts.push([userLocation.lat, userLocation.lng]);
    return pts;
  }, [located, userLocation]);

  return (
    <div className={cn('relative z-0 overflow-hidden rounded-2xl border', className)}>
      <MapContainer
        center={[34.0, 9.5]}
        zoom={6}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />

        {located.map(d => (
          <Marker key={d.id} position={[d.lat as number, d.lng as number]} icon={doctorIcon}>
            <Popup>
              <div className="min-w-[9rem]">
                <p className="font-semibold text-sm">{d.name}</p>
                {d.specialty && <p className="text-xs text-muted-foreground">{d.specialty}</p>}
                <div className="my-1"><StarRating value={d.avg_rating ?? 0} count={d.review_count} size={12} /></div>
                {d.cost != null && <p className="text-xs">{d.cost} DT / visit</p>}
                <Link to={`/doctor/${d.id}`} className="text-primary text-xs font-semibold hover:underline">
                  View profile &amp; book →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
