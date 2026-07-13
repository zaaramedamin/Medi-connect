import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Minus, Plus, LocateFixed, Navigation, MapPin, Maximize2, Layers, Map as MapIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

/** Street level — close enough to see the building, wide enough to place it. */
const DEFAULT_ZOOM = 16;

type BaseStyle = 'map' | 'satellite';

const OSM_CREDIT =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

interface Basemap {
  url: string;
  attribution: string;
  /** Only for providers whose URL has an {s} placeholder. */
  subdomains?: string;
  maxZoom: number;
}

// CARTO's basemaps are far quieter than raw OSM tiles: fewer competing colours,
// so the pin is the only thing that draws the eye. `{r}` gives @2x tiles on
// retina screens automatically.
const BASEMAPS: Record<'light' | 'dark' | 'satellite', Basemap> = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: `${OSM_CREDIT} &copy; <a href="https://carto.com/attributions">CARTO</a>`,
    subdomains: 'abcd',
    maxZoom: 20,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: `${OSM_CREDIT} &copy; <a href="https://carto.com/attributions">CARTO</a>`,
    subdomains: 'abcd',
    maxZoom: 20,
  },
  // Note the {z}/{y}/{x} order — Esri's scheme, not the usual {z}/{x}/{y}.
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
};

// Street names on top of the imagery — satellite alone is pretty but useless
// for finding a door.
const SATELLITE_LABELS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

/**
 * A pin carrying the doctor's photo, so it reads as "Dr. X is here" rather than
 * as an anonymous marker. Built with DOM calls rather than an HTML string
 * because photoUrl is user-supplied — interpolating it into innerHTML would be
 * an injection hole. Leaflet's divIcon accepts an Element directly.
 */
function buildPin(photoUrl: string | null | undefined, initials: string): HTMLElement {
  const root = document.createElement('div');
  root.className = 'relative flex w-12 flex-col items-center';

  // Exact coordinate: a pulsing dot sitting under the pin's tip.
  const pulse = document.createElement('span');
  pulse.className =
    'absolute bottom-0 left-1/2 h-5 w-5 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary/30 animate-ping';
  const dot = document.createElement('span');
  dot.className =
    'absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary ring-2 ring-white';

  const bubble = document.createElement('span');
  bubble.className =
    'relative z-10 grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-primary text-sm font-bold text-white shadow-xl ring-[3px] ring-white';

  if (photoUrl) {
    const img = document.createElement('img');
    img.src = photoUrl; // property assignment — never parsed as markup
    img.alt = '';
    img.className = 'h-full w-full object-cover';
    // A dead photo URL should fall back to initials, not a broken-image glyph.
    img.onerror = () => {
      img.remove();
      bubble.textContent = initials;
    };
    bubble.appendChild(img);
  } else {
    bubble.textContent = initials;
  }

  const stem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  stem.setAttribute('width', '16');
  stem.setAttribute('height', '11');
  stem.setAttribute('viewBox', '0 0 16 11');
  stem.setAttribute('class', 'relative z-10 -mt-1 drop-shadow-md');
  const tri = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  tri.setAttribute('d', 'M8 11 L0 0 H16 Z');
  tri.setAttribute('fill', 'white');
  stem.appendChild(tri);

  root.append(pulse, dot, bubble, stem);
  return root;
}

/** Scroll-wheel zoom stays off until you click in, so the page can scroll past. */
function ScrollZoomGate({ engaged }: { engaged: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (engaged) map.scrollWheelZoom.enable();
    else map.scrollWheelZoom.disable();
  }, [map, engaged]);
  return null;
}

/** A map mounted inside a dialog measures 0×0 until the dialog has laid out. */
function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 180);
    return () => clearTimeout(id);
  }, [map]);
  return null;
}

function ZoomControls({ center }: { center: [number, number] }) {
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
    'flex h-9 w-9 items-center justify-center bg-background/90 text-foreground backdrop-blur transition-colors hover:bg-background hover:text-primary';

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

function StyleSwitch({ value, onChange }: { value: BaseStyle; onChange: (s: BaseStyle) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    if (!ref.current) return;
    L.DomEvent.disableClickPropagation(ref.current);
    L.DomEvent.disableScrollPropagation(ref.current);
  }, []);

  const options: { key: BaseStyle; label: string; icon: React.ElementType }[] = [
    { key: 'map', label: t('Map'), icon: MapIcon },
    { key: 'satellite', label: t('Satellite'), icon: Layers },
  ];

  return (
    <div ref={ref} className="absolute left-3 top-3 z-[1000] flex overflow-hidden rounded-xl border shadow-lg">
      {options.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold backdrop-blur transition-colors',
            value === key
              ? 'bg-primary text-primary-foreground'
              : 'bg-background/90 text-muted-foreground hover:bg-background hover:text-foreground'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

interface MapViewProps {
  center: [number, number];
  style: BaseStyle;
  dark: boolean;
  pin: HTMLElement;
  interactive: boolean;
  /** Fullscreen doesn't need the click-to-zoom gate — the page can't scroll behind it. */
  gateScroll?: boolean;
}

function MapView({ center, style, dark, pin, interactive, gateScroll = true }: MapViewProps) {
  const t = useT();
  const [engaged, setEngaged] = useState(!gateScroll);

  const base = style === 'satellite' ? BASEMAPS.satellite : dark ? BASEMAPS.dark : BASEMAPS.light;
  const icon = useMemo(() => L.divIcon({ html: pin, className: 'border-0 bg-transparent', iconSize: [48, 59], iconAnchor: [24, 59] }), [pin]);

  // A focus ring around the exact point. Reads as "the practice is in here",
  // and on satellite it lands right on the building.
  const ringColor = style === 'satellite' ? '#ffffff' : '#0b74c4';

  return (
    <div
      className="relative h-full w-full"
      onClick={() => gateScroll && setEngaged(true)}
      onMouseLeave={() => gateScroll && setEngaged(false)}
    >
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        scrollWheelZoom={false}
        attributionControl
        className="h-full w-full bg-muted"
      >
        {/* Keyed so a style change fully remounts the layer — subdomains and
            maxZoom differ between providers and setUrl() alone won't update them. */}
        <TileLayer
          key={style === 'satellite' ? 'satellite' : dark ? 'dark' : 'light'}
          url={base.url}
          attribution={base.attribution}
          subdomains={base.subdomains}
          maxZoom={base.maxZoom}
        />
        {style === 'satellite' && <TileLayer key="sat-labels" url={SATELLITE_LABELS} maxZoom={19} />}

        <Circle
          center={center}
          radius={55}
          pathOptions={{ color: ringColor, weight: 1.5, opacity: 0.7, fillColor: ringColor, fillOpacity: 0.12 }}
        />
        <Marker position={center} icon={icon} />

        {interactive && <ScrollZoomGate engaged={engaged} />}
        {!gateScroll && <InvalidateSizeOnMount />}
        <ZoomControls center={center} />
      </MapContainer>

      {gateScroll && !engaged && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex justify-center pb-6">
          <span className="rounded-full bg-background/85 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            {t('Click the map to zoom')}
          </span>
        </div>
      )}
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
  photoUrl?: string | null;
  className?: string;
}

export function DoctorLocationMap({ lat, lng, address, location, name, photoUrl, className }: Props) {
  const t = useT();
  const dark = useDarkMode();
  const [style, setStyle] = useState<BaseStyle>('map');
  const [expanded, setExpanded] = useState(false);

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // One element per map instance — Leaflet appends it, so the inline map and the
  // fullscreen map can't share a single node.
  const inlinePin = useMemo(() => buildPin(photoUrl, initials), [photoUrl, initials]);
  const dialogPin = useMemo(() => (expanded ? buildPin(photoUrl, initials) : null), [expanded, photoUrl, initials]);

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
    <>
      <div className={cn('overflow-hidden rounded-2xl border', className)}>
        <div className="relative z-0 h-80 w-full sm:h-96">
          <MapView center={center} style={style} dark={dark} pin={inlinePin} interactive />

          <StyleSwitch value={style} onChange={setStyle} />

          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5 rounded-xl border bg-background/90 px-3 py-2 text-xs font-semibold backdrop-blur transition-colors hover:bg-background hover:text-primary"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            {t('Expand')}
          </button>
        </div>

        {/* Address bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-card p-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{label ?? name}</p>
              <p className="text-xs text-muted-foreground">
                {address && location ? location : `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
              </p>
            </div>
          </div>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            <Navigation className="h-3.5 w-3.5" />
            {t('Get directions')}
          </a>
        </div>
      </div>

      {/* Fullscreen */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-5xl gap-3 p-4 sm:p-5">
          <DialogHeader className="pr-8">
            <DialogTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" />
              {label ?? name}
            </DialogTitle>
          </DialogHeader>

          <div className="relative h-[65vh] overflow-hidden rounded-xl border">
            {dialogPin && (
              <MapView center={center} style={style} dark={dark} pin={dialogPin} interactive gateScroll={false} />
            )}
            <StyleSwitch value={style} onChange={setStyle} />
          </div>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Navigation className="h-4 w-4" />
            {t('Get directions')}
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}
