import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Minus, Plus, LocateFixed, Navigation, MapPin } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

const DEFAULT_ZOOM = 15;

// Teardrop pin with a soft pulse, so the single practice location reads as
// "here" rather than as one of many. Matches DoctorMap's pin shape.
const practiceIcon = L.divIcon({
  className: 'border-0 bg-transparent',
  html: `<span class="relative flex h-[42px] w-[30px] items-end justify-center">
    <span class="absolute bottom-0 h-3 w-3 animate-ping rounded-full bg-primary/40"></span>
    <svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg" class="relative drop-shadow-md">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="#0b74c4"/>
      <circle cx="15" cy="15" r="6" fill="white"/>
    </svg>
  </span>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});

/**
 * Scroll-wheel zoom stays off until the user clicks into the map, so scrolling
 * the page past it doesn't get swallowed. Clicking away releases it again.
 */
function ScrollZoomGate({ engaged }: { engaged: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (engaged) map.scrollWheelZoom.enable();
    else map.scrollWheelZoom.disable();
  }, [map, engaged]);
  return null;
}

function MapControls({ center }: { center: [number, number] }) {
  const map = useMap();
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();

  // Without this, clicking a button also drags/zooms the map underneath it.
  useEffect(() => {
    if (!ref.current) return;
    L.DomEvent.disableClickPropagation(ref.current);
    L.DomEvent.disableScrollPropagation(ref.current);
  }, []);

  const btn =
    'flex h-9 w-9 items-center justify-center bg-background/90 text-foreground backdrop-blur transition-colors hover:bg-background hover:text-primary disabled:opacity-40';

  return (
    <div ref={ref} className="absolute right-3 top-3 z-[1000] flex flex-col overflow-hidden rounded-xl border shadow-lg">
      <button type="button" onClick={() => map.zoomIn()} className={cn(btn, 'border-b')} aria-label={t('Zoom in')}>
        <Plus className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => map.zoomOut()} className={cn(btn, 'border-b')} aria-label={t('Zoom out')}>
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => map.flyTo(center, DEFAULT_ZOOM, { duration: 0.6 })}
        className={btn}
        aria-label={t('Recenter on the practice')}
      >
        <LocateFixed className="h-4 w-4" />
      </button>
    </div>
  );
}

interface Props {
  lat?: number | null;
  lng?: number | null;
  /** Street address, shown under the map and used as the directions label. */
  address?: string | null;
  /** City — the fallback label when there's no street address. */
  location?: string | null;
  name: string;
  className?: string;
}

export function DoctorLocationMap({ lat, lng, address, location, name, className }: Props) {
  const t = useT();
  const [engaged, setEngaged] = useState(false);

  const hasCoords = lat != null && lng != null;
  const label = address ?? location ?? null;

  if (!hasCoords) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/30 p-8 text-center', className)}>
        <MapPin className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">{label ?? t('Location not shared')}</p>
        <p className="text-xs text-muted-foreground">
          {label ? t("This doctor hasn't pinned their practice on the map yet.") : t('This doctor has not shared a practice address.')}
        </p>
      </div>
    );
  }

  const center: [number, number] = [lat, lng];
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className={cn('overflow-hidden rounded-2xl border', className)}>
      <div
        className="relative z-0 h-72 w-full sm:h-80"
        onClick={() => setEngaged(true)}
        onMouseLeave={() => setEngaged(false)}
      >
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          zoomControl={false}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ScrollZoomGate engaged={engaged} />
          <MapControls center={center} />
          <Marker position={center} icon={practiceIcon} title={name} />
        </MapContainer>

        {!engaged && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex justify-center pb-3">
            <span className="rounded-full bg-background/85 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              {t('Click the map to zoom')}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-card p-4">
        <div className="flex min-w-0 items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{label ?? name}</p>
            {address && location && <p className="text-xs text-muted-foreground">{location}</p>}
          </div>
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          <Navigation className="h-3.5 w-3.5" />
          {t('Get directions')}
        </a>
      </div>
    </div>
  );
}
