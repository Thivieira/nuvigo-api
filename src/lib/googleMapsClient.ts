import { env } from '@/env';
import axios from 'axios';

const GOOGLE_MAPS_API_KEY = env.GOOGLE_MAPS_API_KEY;
const GEOCODE_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

interface GeocodeResponse {
  results: {
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }[];
  status: string;
}

export interface GetGeocodeResponse {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export async function getGeocode(address: string): Promise<GetGeocodeResponse | null> {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address,
        key: process.env.GOOGLE_MAPS_API_KEY,
        components: 'locality|neighborhood|route|street_address'
      },
    });

    if (response.data.status === 'OK') {
      console.log('Geocoding response:', response.data);
      const result = response.data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
      };
    } else {
      console.error('Geocoding failed:', response.data.status);
      return null;
    }
  } catch (error) {
    console.error('Error getting geocode:', error);
    return null;
  }
}

export interface ReverseGeocodeResponse {
  formattedAddress: string;
  lat: number;
  lng: number;
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResponse | null> {
  try {
    const response = await axios.get<GeocodeResponse>(GEOCODE_BASE_URL, {
      params: {
        latlng: `${lat},${lng}`,
        key: GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.status === 'OK') {
      const result = response.data.results[0];
      return {
        formattedAddress: result.formatted_address,
        lat,
        lng,
      };
    } else {
      console.error('Reverse geocoding failed:', response.data.status);
      return null;
    }
  } catch (error) {
    console.error('Error in reverseGeocode:', error);
    return null;
  }
}
