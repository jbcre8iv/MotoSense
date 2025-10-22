import { Race } from '../types';

export const mockRaces: Race[] = [
  {
    id: 'race-1',
    name: 'Anaheim 1',
    series: 'supercross',
    trackId: 'track-1',
    date: '2025-01-11T19:00:00Z',
    round: 1,
    type: 'main',
    status: 'upcoming'
  },
  {
    id: 'race-2',
    name: 'Glendale',
    series: 'supercross',
    trackId: 'track-2',
    date: '2025-01-25T19:00:00Z',
    round: 2,
    type: 'main',
    status: 'upcoming'
  }
];
