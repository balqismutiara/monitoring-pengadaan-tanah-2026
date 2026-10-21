import {
  useEffect,
  useMemo,
} from 'react';

import {
  latLngBounds,
} from 'leaflet';

import {
  CircleMarker,
  LayersControl,
  MapContainer,
  Popup,
  ScaleControl,
  TileLayer,
  useMap,
  ZoomControl,
} from 'react-leaflet';

import {
  LAND_MAP_LOCATIONS,
  type LandMapLocation,
} from '../mapData';

interface LandAcquisitionMapProps {
  selectedProgramName?: string;
}

/* =========================================================
   DEFAULT MAP POSITION

   Digunakan jika belum ada lokasi program yang tersedia.
========================================================= */

const DEFAULT_CENTER: [
  number,
  number,
] = [
  -6.1754,
  106.8272,
];

/* =========================================================
   NORMALIZE TEXT

   Supaya:
   "Pengadaan Tanah NPEA"
   dan
   "pengadaan tanah npea"

   tetap dianggap program yang sama.
========================================================= */

const normalizeText = (
  value?: string,
) =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

/* =========================================================
   AUTO FOCUS MAP

   0 lokasi  → kembali ke posisi default
   1 lokasi  → zoom ke titik tersebut
   >1 lokasi → tampilkan seluruh titik
========================================================= */

function MapAutoFocus({
  locations,
}: {
  locations: LandMapLocation[];
}) {
  const map = useMap();

  useEffect(() => {
    if (
      locations.length === 0
    ) {
      map.setView(
        DEFAULT_CENTER,
        11,
        {
          animate: true,
        },
      );

      return;
    }

    if (
      locations.length === 1
    ) {
      map.flyTo(
        locations[0].center,
        15,
        {
          animate: true,
          duration: 0.8,
        },
      );

      return;
    }

    const bounds =
      latLngBounds(
        locations.map(
          (location) =>
            location.center,
        ),
      );

    map.fitBounds(
      bounds,
      {
        padding: [
          55,
          55,
        ],

        maxZoom: 14,

        animate: true,
      },
    );
  }, [
    locations,
    map,
  ]);

  return null;
}

/* =========================================================
   RESPONSIVE MAP FIX

   Leaflet kadang tidak otomatis menghitung ulang ukuran
   ketika sidebar/dashboard berubah ukuran.

   ResizeObserver membuat map tetap penuh dan tidak blank.
========================================================= */

function MapResizeFix() {
  const map = useMap();

  useEffect(() => {
    const mapElement =
      map.getContainer();

    const refreshMap = () => {
      window.requestAnimationFrame(
        () => {
          map.invalidateSize({
            animate: false,
          });
        },
      );
    };

    refreshMap();

    const resizeObserver =
      new ResizeObserver(
        refreshMap,
      );

    resizeObserver.observe(
      mapElement,
    );

    window.addEventListener(
      'resize',
      refreshMap,
    );

    return () => {
      resizeObserver.disconnect();

      window.removeEventListener(
        'resize',
        refreshMap,
      );
    };
  }, [
    map,
  ]);

  return null;
}

/* =========================================================
   LAND ACQUISITION MAP
========================================================= */

export function LandAcquisitionMap({
  selectedProgramName =
    'Semua Program',
}: LandAcquisitionMapProps) {
  /* -------------------------------------------------------
     FILTER LOKASI BERDASARKAN PROGRAM
  ------------------------------------------------------- */

  const visibleLocations =
    useMemo(() => {
      const normalizedSelection =
        normalizeText(
          selectedProgramName,
        );

      if (
        !normalizedSelection ||
        normalizedSelection ===
          'semua program'
      ) {
        return LAND_MAP_LOCATIONS;
      }

      return LAND_MAP_LOCATIONS.filter(
        (location) =>
          normalizeText(
            location.programName,
          ) ===
          normalizedSelection,
      );
    }, [
      selectedProgramName,
    ]);

  /* -------------------------------------------------------
     LABEL DATA AKTIF
  ------------------------------------------------------- */

  const activeLabel =
    selectedProgramName &&
    selectedProgramName !==
      'Semua Program'
      ? selectedProgramName
      : 'Semua Program';

  return (
    <div
      className="
        land-acquisition-map
        relative
        h-[338px]
        w-full
        overflow-hidden
        bg-slate-100
      "
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={11}
        minZoom={4}
        maxZoom={19}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        zoomControl={false}
        className="h-full w-full"
      >
        {/* ===============================================
            MAP BEHAVIOUR
        =============================================== */}

        <MapResizeFix />

        <MapAutoFocus
          locations={
            visibleLocations
          }
        />

        {/* ===============================================
            BASE MAP / LAYER
        =============================================== */}

        <LayersControl
          position="topright"
        >
          {/* PETA JALAN */}

          <LayersControl.BaseLayer
            checked
            name="Peta Jalan"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>

          {/* PETA SATELIT */}

          <LayersControl.BaseLayer
            name="Satelit"
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* ===============================================
            MAP CONTROLS
        =============================================== */}

        <ZoomControl
          position="bottomright"
        />

        <ScaleControl
          position="bottomleft"
          metric={true}
          imperial={false}
        />

        {/* ===============================================
            PROGRAM LOCATION MARKERS
        =============================================== */}

        {visibleLocations.map(
          (location) => (
            <CircleMarker
              key={location.id}
              center={
                location.center
              }
              radius={9}
              pathOptions={{
                color: '#FFFFFF',

                weight: 3,

                fillColor:
                  location.color,

                fillOpacity: 1,
              }}
            >
              <Popup
                closeButton={true}
              >
                <div
                  style={{
                    width:
                      '210px',

                    maxWidth:
                      '210px',
                  }}
                >
                  {/* LOCATION */}

                  <p
                    style={{
                      margin:
                        '0 0 4px 0',

                      fontSize:
                        '13px',

                      lineHeight:
                        '18px',

                      fontWeight:
                        700,

                      color:
                        '#0B2A63',
                    }}
                  >
                    {
                      location.locationName
                    }
                  </p>

                  {/* PROGRAM */}

                  <p
                    style={{
                      margin:
                        '0 0 12px 0',

                      fontSize:
                        '10px',

                      lineHeight:
                        '15px',

                      color:
                        '#64748B',
                    }}
                  >
                    {
                      location.programName
                    }
                  </p>

                  {/* INFORMATION */}

                  <div
                    style={{
                      display:
                        'grid',

                      gridTemplateColumns:
                        '72px 1fr',

                      rowGap:
                        '7px',

                      columnGap:
                        '8px',

                      fontSize:
                        '10px',
                    }}
                  >
                    <span
                      style={{
                        color:
                          '#94A3B8',
                      }}
                    >
                      Progress
                    </span>

                    <strong
                      style={{
                        color:
                          '#0B2A63',
                      }}
                    >
                      {
                        location.progress
                      }
                      %
                    </strong>

                    <span
                      style={{
                        color:
                          '#94A3B8',
                      }}
                    >
                      Tahapan
                    </span>

                    <strong
                      style={{
                        color:
                          '#0B2A63',
                      }}
                    >
                      {
                        location.stage
                      }
                    </strong>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ),
        )}
      </MapContainer>

      {/* =================================================
          DATA AKTIF
      ================================================= */}

      <div
        className="
          pointer-events-none
          absolute
          left-4
          top-4
          z-[500]
          min-w-[135px]
          max-w-[240px]
          rounded-xl
          border
          border-white/80
          bg-white/95
          px-3
          py-2
          shadow-md
          backdrop-blur
        "
      >
        <p
          className="
            text-[7.5px]
            font-bold
            uppercase
            tracking-[0.12em]
            text-slate-400
          "
        >
          Data Aktif
        </p>

        <p
          className="
            mt-0.5
            truncate
            text-[9px]
            font-bold
            text-[#0B2A63]
          "
        >
          {activeLabel}
        </p>

        {visibleLocations.length >
          0 && (
          <p
            className="
              mt-0.5
              text-[7.5px]
              text-slate-400
            "
          >
            {
              visibleLocations.length
            }{' '}
            lokasi terpetakan
          </p>
        )}
      </div>

      {/* =================================================
          EMPTY STATE
      ================================================= */}

      {visibleLocations.length ===
        0 && (
        <div
          className="
            pointer-events-none
            absolute
            bottom-4
            left-1/2
            z-[500]
            w-[calc(100%-32px)]
            max-w-[360px]
            -translate-x-1/2
            rounded-xl
            bg-[#082B51]/90
            px-4
            py-2.5
            text-center
            shadow-lg
            backdrop-blur
          "
        >
          <p
            className="
              text-[9px]
              font-semibold
              text-white
            "
          >
            Lokasi program belum
            tersedia pada peta.
          </p>

          <p
            className="
              mt-1
              text-[7.5px]
              text-white/65
            "
          >
            Tambahkan koordinat atau
            data spasial pada Master
            Data.
          </p>
        </div>
      )}
    </div>
  );
}

export default LandAcquisitionMap;