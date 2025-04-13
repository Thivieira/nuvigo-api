import { Prisma, Location as PrismaLocation } from '@prisma/generated/client';
import { HTTPException } from '../exceptions';
import { prisma } from '@/lib/prisma';

export class LocationService {
  static async getUserLocations(userId: string): Promise<PrismaLocation[]> {
    return prisma.location.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async addLocation(userId: string, name: string): Promise<PrismaLocation> {
    // Check if location already exists for user
    const existingLocation = await prisma.location.findFirst({
      where: { userId, name },
    });

    if (existingLocation) {
      throw new HTTPException(400, { message: 'Location already exists for this user' });
    }

    // Check if this is the first location for the user
    const userLocations = await prisma.location.count({
      where: { userId },
    });

    // If this is the first location, set it as active
    const isActive = userLocations === 0;

    return prisma.location.create({
      data: {
        name,
        userId,
        isActive,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            role: true
          }
        }
      }
    });
  }

  static async setActiveLocation(userId: string, locationId: string): Promise<PrismaLocation> {
    // Verify location exists and belongs to user
    const location = await prisma.location.findFirst({
      where: { id: locationId, userId },
    });

    if (!location) {
      throw new HTTPException(404, { message: 'Location not found' });
    }

    // Start a transaction to update all locations
    return prisma.$transaction(async (tx) => {
      // First, set all locations to inactive
      await tx.location.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      // Then, set the specified location to active
      return tx.location.update({
        where: { id: locationId },
        data: { isActive: true },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              emailVerified: true,
              createdAt: true,
              updatedAt: true,
              role: true
            }
          }
        }
      });
    });
  }

  static async deleteLocation(userId: string, locationId: string): Promise<void> {
    // Get all user locations
    const userLocations = await prisma.location.findMany({
      where: { userId },
    });

    if (userLocations.length <= 1) {
      throw new HTTPException(400, { message: 'Cannot delete the last location' });
    }

    const locationToDelete = userLocations.find((loc) => loc.id === locationId);
    if (!locationToDelete) {
      throw new HTTPException(404, { message: 'Location not found' });
    }

    // Start a transaction to handle the deletion and potential active location update
    await prisma.$transaction(async (tx) => {
      // Delete the location
      await tx.location.delete({
        where: { id: locationId },
      });

      // If the deleted location was active, set another location as active
      if (locationToDelete.isActive) {
        const newActiveLocation = userLocations.find((loc) => loc.id !== locationId);
        if (newActiveLocation) {
          await tx.location.update({
            where: { id: newActiveLocation.id },
            data: { isActive: true },
          });
        }
      }
    });
  }
} 