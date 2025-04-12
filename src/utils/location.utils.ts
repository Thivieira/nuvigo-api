import { Location } from '@prisma/client';
import { LocationService } from '@/services/location.service';
import axios from 'axios';

interface LocationAnalysis {
  location: string;
  confidence: number;
  source: 'context' | 'saved' | 'default';
}

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
export async function validateLocation(location: string): Promise<boolean> {
  try {
    const response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json`,
      {
        params: {
          access_token: process.env.MAPBOX_API_KEY,
          types: 'place',
          limit: 1
        }
      }
    );

    return response.data.features.length > 0;
  } catch (error) {
    console.error('Error validating location:', error);
    return false;
  }
} 