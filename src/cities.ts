import type { CityLocation } from './types'

export const CITY_LOCATIONS: Record<string, CityLocation> = {
  Atlanta: { city: 'Atlanta', label: 'Atlanta', lat: 33.7554, lng: -84.4008 },
  Boston: { city: 'Boston', label: 'Boston', lat: 42.0909, lng: -71.2643 },
  Dallas: { city: 'Dallas', label: 'Dallas', lat: 32.7473, lng: -97.0945 },
  Guadalajara: { city: 'Guadalajara', label: 'Guadalajara', lat: 20.6818, lng: -103.4627 },
  Houston: { city: 'Houston', label: 'Houston', lat: 29.6847, lng: -95.4107 },
  'Kansas City': { city: 'Kansas City', label: 'Kansas City', lat: 39.0489, lng: -94.4839 },
  'Los Angeles': { city: 'Los Angeles', label: 'Los Angeles', lat: 33.9535, lng: -118.3392 },
  'Mexico City': { city: 'Mexico City', label: 'Mexico City', lat: 19.3029, lng: -99.1505 },
  Miami: { city: 'Miami', label: 'Miami', lat: 25.958, lng: -80.2389 },
  Monterrey: { city: 'Monterrey', label: 'Monterrey', lat: 25.6688, lng: -100.2449 },
  'New York/New Jersey': {
    city: 'New York/New Jersey',
    label: 'New York/New Jersey',
    lat: 40.8136,
    lng: -74.0744,
  },
  Philadelphia: { city: 'Philadelphia', label: 'Philadelphia', lat: 39.9008, lng: -75.1675 },
  'San Francisco Bay Area': {
    city: 'San Francisco Bay Area',
    label: 'San Francisco Bay Area',
    lat: 37.4033,
    lng: -121.9694,
  },
  Seattle: { city: 'Seattle', label: 'Seattle', lat: 47.5952, lng: -122.3316 },
  Toronto: { city: 'Toronto', label: 'Toronto', lat: 43.6332, lng: -79.4186 },
  Vancouver: { city: 'Vancouver', label: 'Vancouver', lat: 49.2768, lng: -123.1119 },
}
