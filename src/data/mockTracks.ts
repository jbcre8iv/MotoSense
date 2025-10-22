import { Track } from '../types';

export const mockTracks: Track[] = [
  {
    id: 'track-1',
    name: 'Angel Stadium',
    city: 'Anaheim',
    state: 'CA',
    latitude: 33.8003,
    longitude: -117.8827,
    type: 'indoor',
    soilType: 'Clay-based',
    trackLength: 0.5
  },
  {
    id: 'track-2',
    name: 'State Farm Stadium',
    city: 'Glendale',
    state: 'AZ',
    latitude: 33.5276,
    longitude: -112.2626,
    type: 'indoor',
    soilType: 'Sandy loam',
    trackLength: 0.48
  }
];
