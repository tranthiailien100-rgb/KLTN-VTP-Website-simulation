import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { PLACES, ROUTES } from '../../config/journeys.js';
import { BASEMAPS, BASEMAP_BY_VIEW, MAP_MIN_ZOOM } from '../../config/map.js';
import { splitAlong } from '../../sim/geo.js';
import { selectPosition, selectLastMile, selectVisitedPlaces } from '../../sim/engine.js';

// Bản đồ hai cấp (Leaflet; nguồn nền cấu hình ở src/config/map.js):
//   view 'route'    : đường dài theo chặng bưu cục (Hà Nội → Đà Nẵng → TP.HCM)
//   view 'lastmile' : chặng cuối, bưu tá di chuyển trực tiếp
const FULL_LEGS = ['sender_poA', 'poA_ttkt_hn', 'hn_dn', 'dn_hcm', 'hcm_poB'];
const HUBS = [
  { key: 'poA', label: null },
  { key: 'ttkt_hn', label: 'Hà Nội' },
  { key: 'ttkt_dn', label: 'Đà Nẵng' },
  { key: 'ttkt_hcm', label: 'TP.HCM' },
  { key: 'poB', label: null },
];
const ll = (p) => [p.lat, p.lng];

const TRUCK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>';
const BIKE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h3l-3 7M5.5 17.5 9 9h6l3.5 8.5M9 9H7"/></svg>';
const HUB_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></svg>';
const HOME_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>';

const markerIcon = (courier) =>
  L.divIcon({
    className: '',
    html: `<div class="vt-marker ${courier ? 'courier' : ''}"><span class="ring"></span><span class="core">${courier ? BIKE : TRUCK}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
const pinIcon = (svg, home) => L.divIcon({ className: '', html: `<div class="vt-pin ${home ? 'home' : ''}">${svg}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });

export function TrackingMap({ view, state, className = '' }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layers = useRef({ stat: null, dyn: null, marker: null });
  const lastView = useRef(null);
  const tile = useRef({ layer: null, id: null });

  const pos = selectPosition(state);
  const lm = selectLastMile(state);
  const visited = selectVisitedPlaces(state);
  const visitedKey = [...visited].sort().join(',');

  // ---- tạo bản đồ một lần
  useEffect(() => {
    const map = L.map(elRef.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true, minZoom: MAP_MIN_ZOOM });
    layers.current = { stat: L.layerGroup().addTo(map), dyn: L.layerGroup().addTo(map), marker: null };
    mapRef.current = map;
    map.setView([16.2, 107.4], MAP_MIN_ZOOM);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layers.current = { stat: null, dyn: null, marker: null };
      lastView.current = null;
      tile.current = { layer: null, id: null };
    };
  }, []);

  // ---- nền bản đồ: đổi theo cấp (toàn tuyến / chặng cuối), cấu hình ở src/config/map.js
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = BASEMAP_BY_VIEW[view];
    if (tile.current.id === id) return;
    const b = BASEMAPS[id];
    if (tile.current.layer) tile.current.layer.remove();
    const layer = L.tileLayer(b.url, { maxZoom: 19, maxNativeZoom: b.maxNativeZoom, attribution: b.attribution }).addTo(map);
    layer.bringToBack();
    tile.current = { layer, id };
  }, [view]);

  // ---- lớp tĩnh (đường nền, điểm dừng): vẽ lại khi đổi view hoặc có điểm mới được đi qua
  useEffect(() => {
    const map = mapRef.current;
    const { stat } = layers.current;
    if (!map || !stat) return;
    stat.clearLayers();
    const bounds = [];

    if (view === 'lastmile') {
      const route = ROUTES.lastmile;
      L.polyline(route.map(ll), { color: '#94a3b8', weight: 5, dashArray: '2 10', lineCap: 'round' }).addTo(stat);
      L.marker(ll(PLACES.poB), { icon: pinIcon(HUB_SVG, false), keyboard: false })
        .bindTooltip('Bưu cục Tân Thuận', { permanent: true, direction: 'top', offset: [0, -14], className: 'vt-label' })
        .addTo(stat);
      L.marker(ll(PLACES.recipient), { icon: pinIcon(HOME_SVG, true), keyboard: false })
        .bindTooltip('Người nhận', { permanent: true, direction: 'top', offset: [0, -14], className: 'vt-label' })
        .addTo(stat);
      // kịch bản giao sai: khung bản đồ gồm cả đoạn bưu tá đi lệch, đánh dấu nơi bưu tá bấm "đã giao"
      state.script.forEach((st) => {
        if (st.travel === 'lastmile_wrong' || st.travel === 'offsite_recipient') ROUTES[st.travel].forEach((p) => bounds.push(ll(p)));
      });
      if (visited.has('offsite')) {
        L.circleMarker(ll(PLACES.offsite), { radius: 8, weight: 3, color: '#fff', fillColor: '#d97706', fillOpacity: 1 })
          .bindTooltip('Nơi bưu tá báo “đã giao”', { permanent: true, direction: 'bottom', offset: [0, 10], className: 'vt-label' })
          .addTo(stat);
      }
      route.forEach((p) => bounds.push(ll(p)));
    } else {
      const legs = FULL_LEGS.filter((k) => state.script.some((s) => s.travel === k));
      legs.forEach((k) => {
        L.polyline(ROUTES[k].map(ll), { color: '#94a3b8', weight: 4, dashArray: '6 8' }).addTo(stat);
        ROUTES[k].forEach((p) => bounds.push(ll(p)));
      });
      HUBS.forEach((h) => {
        const p = PLACES[h.key];
        const seen = visited.has(h.key);
        const m = L.circleMarker(ll(p), {
          radius: h.label ? 8 : 6,
          weight: 3,
          color: seen ? '#fff' : '#9ca3af',
          fillColor: seen ? '#ee0033' : '#fff',
          fillOpacity: 1,
        }).addTo(stat);
        if (h.label) m.bindTooltip(h.label, { permanent: true, direction: 'right', offset: [8, 0], className: 'vt-label' });
      });
    }

    if (lastView.current !== view && bounds.length) {
      map.invalidateSize();
      map.fitBounds(L.latLngBounds(bounds), { padding: [28, 28], animate: lastView.current !== null });
      lastView.current = view;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, visitedKey]);

  // ---- lớp động: đoạn đã đi + chấm vị trí hiện tại (cập nhật mỗi nhịp đồng hồ)
  useEffect(() => {
    const map = mapRef.current;
    const { dyn } = layers.current;
    if (!map || !dyn) return;
    dyn.clearLayers();

    let point;
    if (view === 'lastmile') {
      if (lm) {
        if (lm.done.length > 1) L.polyline(lm.done.map(ll), { color: '#ee0033', weight: 5, opacity: 0.95, lineCap: 'round' }).addTo(dyn);
        point = lm.pos;
      } else {
        point = { lat: PLACES.poB.lat, lng: PLACES.poB.lng };
      }
    } else {
      const legs = FULL_LEGS.filter((k) => state.script.some((s) => s.travel === k));
      legs.forEach((k) => {
        const def = state.script.find((s) => s.travel === k);
        const completed = state.events.some((e) => e.stepId === def.id);
        let seg = null;
        if (completed) seg = ROUTES[k];
        else if (pos.travelling && pos.routeKey === k) seg = splitAlong(ROUTES[k], pos.fraction).done;
        if (seg && seg.length > 1) L.polyline(seg.map(ll), { color: '#ee0033', weight: 5, opacity: 0.95, lineCap: 'round' }).addTo(dyn);
      });
      point = { lat: pos.lat, lng: pos.lng };
    }

    const courier = view === 'lastmile';
    const { marker } = layers.current;
    if (!marker || marker.__courier !== courier) {
      if (marker) marker.remove();
      const m = L.marker([point.lat, point.lng], { icon: markerIcon(courier), keyboard: false, zIndexOffset: 1000 }).addTo(map);
      m.__courier = courier;
      layers.current.marker = m;
    } else {
      marker.setLatLng([point.lat, point.lng]);
    }
  });

  return (
    <div
      ref={elRef}
      className={`z-0 h-[360px] w-full overflow-hidden rounded-lg bg-slate-100 sm:h-[400px] ${className}`}
      role="application"
      aria-label={view === 'lastmile' ? 'Bản đồ chặng cuối' : 'Bản đồ toàn tuyến'}
    />
  );
}
