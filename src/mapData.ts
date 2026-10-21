export type MapCoordinate = [
  number,
  number
];

export interface LandMapLocation {
  id: string;

  programName: string;

  locationName: string;

  center: MapCoordinate;

  progress: number;

  stage: string;

  color: string;
}

export const LAND_MAP_LOCATIONS: LandMapLocation[] = [
  {
    id: 'npea-marunda',

    programName:
      'Pengadaan Tanah NPEA',

    locationName:
      'Marunda',

    center: [
      -6.105,
      106.955,
    ],

    progress: 51,

    stage:
      'Pelaksanaan',

    color:
      '#18A85A',
  },

  {
    id: 'npea-cilincing',

    programName:
      'Pengadaan Tanah NPEA',

    locationName:
      'Cilincing',

    center: [
      -6.115,
      106.935,
    ],

    progress: 51,

    stage:
      'Pelaksanaan',

    color:
      '#1467E8',
  },
];