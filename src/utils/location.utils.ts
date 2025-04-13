import { Location as PrismaLocation } from '@prisma/generated/client';
import { LocationService } from '@/services/location.service';
import axios from 'axios';
import { env } from '@/env';

interface LocationAnalysis {
  location: string;
  confidence: number;
  source: 'context' | 'saved' | 'default';
}

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface FormattedLocation {
  name: string;
  coordinates?: LocationCoordinates;
  countryCode?: string;
}

export interface LocationInput {
  type?: 'Point';
  coordinates?: [number, number];
  name?: string;
  lat?: number;
  lon?: number;
}

// Extend PrismaLocation to include coordinates
interface ExtendedPrismaLocation extends PrismaLocation {
  coordinates?: [number, number];
}

const COUNTRY_CODES: Record<string, string> = {
  'brazil': 'BR',
  'brasil': 'BR',
  'rio de janeiro': 'BR',
  'são paulo': 'BR',
  'sao paulo': 'BR',
  'united states': 'US',
  'usa': 'US',
  'new york': 'US',
  'united kingdom': 'GB',
  'uk': 'GB',
  'london': 'GB',
  'france': 'FR',
  'paris': 'FR',
  'germany': 'DE',
  'berlin': 'DE',
  'spain': 'ES',
  'madrid': 'ES',
  'italy': 'IT',
  'rome': 'IT',
  'portugal': 'PT',
  'lisbon': 'PT'
};

/**
 * Extracts location information from text using NLP
 */
export async function extractLocationFromText(text: string): Promise<string | null> {
  try {
    // This is a simplified version - in production you might want to use a more sophisticated NLP service
    const prompt = `
      Extract the location name from the following text. 
      Return ONLY the location name if found, or "null" if no location is mentioned.
      Text: "${text}"
    `;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const location = response.data.choices[0].message.content.trim();
    return location === 'null' ? null : location;
  } catch (error) {
    console.error('Error extracting location from text:', error);
    return null;
  }
}

/**
 * Analyzes the context to determine the most appropriate location
 */
export async function analyzeLocation(
  text: string,
  userId: string,
  defaultLocation: string = 'São Paulo'
): Promise<LocationAnalysis> {
  try {
    // 1. Try to extract location from the text
    const extractedLocation = await extractLocationFromText(text);

    if (extractedLocation) {
      // Validate if the extracted location exists in user's saved locations
      const userLocations = await LocationService.getUserLocations(userId);
      const matchingLocation = userLocations.find(loc =>
        loc.name.toLowerCase() === extractedLocation.toLowerCase()
      );

      if (matchingLocation) {
        return {
          location: matchingLocation.name,
          confidence: 0.9,
          source: 'saved'
        };
      }

      // If not found in saved locations, return the extracted location
      return {
        location: extractedLocation,
        confidence: 0.7,
        source: 'context'
      };
    }

    // 2. Try to get user's active location
    const userLocations = await LocationService.getUserLocations(userId);
    const activeLocation = userLocations.find(loc => loc.isActive);

    if (activeLocation) {
      return {
        location: activeLocation.name,
        confidence: 0.8,
        source: 'saved'
      };
    }

    // 3. Fall back to default location
    return {
      location: defaultLocation,
      confidence: 0.5,
      source: 'default'
    };
  } catch (error) {
    console.error('Error analyzing location:', error);
    return {
      location: defaultLocation,
      confidence: 0.3,
      source: 'default'
    };
  }
}

/**
 * Validates a location name using a geocoding service
 */
export async function validateLocation(location: string | LocationInput | ExtendedPrismaLocation): Promise<boolean> {
  try {
    if (typeof location === 'string') {
      // Check if it's valid coordinates
      if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(location)) {
        const [lat, lng] = location.split(',').map(coord => parseFloat(coord.trim()));
        return !isNaN(lat) && !isNaN(lng) &&
          lat >= -90 && lat <= 90 &&
          lng >= -180 && lng <= 180;
      }
      // Check if it's a valid location name
      return location.trim().length > 0;
    }

    // Check if it's a valid PrismaLocation
    if ('id' in location) {
      return location.name.trim().length > 0 &&
        (!location.coordinates ||
          (location.coordinates.length === 2 &&
            !isNaN(location.coordinates[0]) &&
            !isNaN(location.coordinates[1])));
    }

    // Check if it's a valid LocationInput
    if (location.lat !== undefined && location.lon !== undefined) {
      return !isNaN(location.lat) && !isNaN(location.lon) &&
        location.lat >= -90 && location.lat <= 90 &&
        location.lon >= -180 && location.lon <= 180;
    }

    if (location.coordinates) {
      return location.coordinates.length === 2 &&
        !isNaN(location.coordinates[0]) && !isNaN(location.coordinates[1]) &&
        location.coordinates[0] >= -90 && location.coordinates[0] <= 90 &&
        location.coordinates[1] >= -180 && location.coordinates[1] <= 180;
    }

    return location.name ? location.name.trim().length > 0 : false;
  } catch (error) {
    return false;
  }
}

export async function findMatchingLocation(
  extractedLocation: string,
  userLocations: PrismaLocation[]
): Promise<{ location: string; isNew: boolean }> {
  const matchingLocation = userLocations.find(
    (loc) => loc.name.toLowerCase() === extractedLocation.toLowerCase()
  );

  if (matchingLocation) {
    return {
      location: matchingLocation.name,
      isNew: false,
    };
  }

  return {
    location: extractedLocation,
    isNew: true,
  };
}

export async function getActiveLocation(
  userLocations: PrismaLocation[]
): Promise<{ location: string; isNew: boolean }> {
  const activeLocation = userLocations.find((loc) => loc.isActive);

  if (activeLocation) {
    return {
      location: activeLocation.name,
      isNew: false,
    };
  }

  return {
    location: '',
    isNew: true,
  };
}

export async function formatLocation(location: string | LocationInput | ExtendedPrismaLocation): Promise<FormattedLocation> {
  try {
    // If location is already a PrismaLocation object
    if (typeof location === 'object' && 'id' in location) {
      return {
        name: location.name,
        coordinates: location.coordinates ? {
          lat: location.coordinates[0],
          lng: location.coordinates[1]
        } : undefined
      };
    }

    // If location is a string
    if (typeof location === 'string') {
      // Check if it's coordinates
      const isCoordinates = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(location);
      if (isCoordinates) {
        const [lat, lng] = location.split(',').map(coord => parseFloat(coord.trim()));
        return {
          name: location,
          coordinates: { lat, lng }
        };
      }

      // Try to get coordinates from Google Maps API
      try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: {
            address: location,
            key: env.GOOGLE_MAPS_API_KEY
          }
        });

        if (response.data.results && response.data.results.length > 0) {
          const result = response.data.results[0];
          const components = result.address_components;
          const countryComponent = components.find((comp: any) => comp.types.includes('country'));

          return {
            name: result.formatted_address,
            coordinates: {
              lat: result.geometry.location.lat,
              lng: result.geometry.location.lng
            },
            countryCode: countryComponent?.short_name
          };
        }
      } catch (error) {
        console.warn('Failed to geocode location:', error);
      }

      // Fallback to simple country code detection
      const lowerLocation = location.toLowerCase();
      let countryCode: string | undefined;

      for (const [key, code] of Object.entries(COUNTRY_CODES)) {
        if (lowerLocation.includes(key)) {
          countryCode = code;
          break;
        }
      }

      return {
        name: location,
        countryCode
      };
    }

    // Handle LocationInput object
    if (location.lat !== undefined && location.lon !== undefined) {
      return {
        name: location.name || `${location.lat},${location.lon}`,
        coordinates: { lat: location.lat, lng: location.lon }
      };
    }

    if (location.coordinates) {
      return {
        name: location.name || location.coordinates.join(','),
        coordinates: { lat: location.coordinates[0], lng: location.coordinates[1] }
      };
    }

    return {
      name: location.name || 'Unknown Location'
    };
  } catch (error) {
    console.error('Error formatting location:', error);
    throw new Error('Failed to format location');
  }
}

export function getLocationString(location: FormattedLocation): string {
  if (location.coordinates) {
    return `${location.coordinates.lat},${location.coordinates.lng}`;
  }

  if (location.countryCode) {
    return `${location.name},${location.countryCode}`;
  }

  return location.name;
} 