import { 
  users, resources, resourceRequests, donations, volunteers, emergencies, notifications,
  type User, type Resource, type ResourceRequest, type Donation, type Volunteer, 
  type Emergency, type Notification, type InsertUser 
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { IStorage } from "./storage";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      pinCode: insertUser.pinCode || null,
      pinCodeRangeStart: insertUser.pinCodeRangeStart || null,
      pinCodeRangeEnd: insertUser.pinCodeRangeEnd || null,
      registrationId: insertUser.registrationId || null,
      specialization: insertUser.specialization || null,
      walletBalance: 0,
      assignedFireStationId: null
    }).returning();

    // If user is local, assign a fire station based on PIN code
    if (insertUser.userType === 'local' && insertUser.pinCode) {
      const fireStation = await this.getFireStationsByPinCode(insertUser.pinCode);
      if (fireStation) {
        await db.update(users)
          .set({ assignedFireStationId: fireStation.id })
          .where(eq(users.id, user.id));
        user.assignedFireStationId = fireStation.id;
      }
    }

    return user;
  }

  async updateUserWalletBalance(userId: number, amount: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const newBalance = (user.walletBalance || 0) + amount;
    const [updatedUser] = await db.update(users)
      .set({ walletBalance: newBalance })
      .where(eq(users.id, userId))
      .returning();
      
    return updatedUser;
  }

  async getFireStationsByPinCode(pinCode: string): Promise<User | undefined> {
    // Since we can't directly compare strings with columns in Drizzle,
    // we'll fetch all fire stations and filter in JS
    const fireStations = await db.select()
      .from(users)
      .where(eq(users.userType, 'firestation'));
      
    // Find the first fire station where the pin code is within range
    return fireStations.find(fs => 
      fs.pinCodeRangeStart && 
      fs.pinCodeRangeEnd && 
      pinCode >= fs.pinCodeRangeStart && 
      pinCode <= fs.pinCodeRangeEnd
    );
  }

  async getAllFireStations(): Promise<User[]> {
    return db.select()
      .from(users)
      .where(eq(users.userType, 'firestation'));
  }

  async getAllNGOs(): Promise<User[]> {
    return db.select()
      .from(users)
      .where(eq(users.userType, 'ngo'));
  }

  // Resource operations
  async getResources(ownerId?: number): Promise<Resource[]> {
    if (ownerId !== undefined) {
      return db.select()
        .from(resources)
        .where(eq(resources.ownerId, ownerId));
    }
    
    return db.select().from(resources);
  }

  async createResource(resource: Omit<Resource, "id">): Promise<Resource> {
    const [newResource] = await db.insert(resources)
      .values(resource)
      .returning();
      
    return newResource;
  }

  async updateResourceQuantity(resourceId: number, newQuantity: number): Promise<Resource | undefined> {
    const [resource] = await db.update(resources)
      .set({ quantity: newQuantity })
      .where(eq(resources.id, resourceId))
      .returning();
      
    return resource;
  }

  // Resource request operations
  async getResourceRequests(requesterId?: number, status?: string): Promise<ResourceRequest[]> {
    let query = db.select().from(resourceRequests);
    
    if (requesterId !== undefined) {
      query = query.where(eq(resourceRequests.requesterId, requesterId));
    }
    
    if (status !== undefined) {
      query = query.where(eq(resourceRequests.status, status));
    }
    
    return query.orderBy(desc(resourceRequests.createdAt));
  }

  async createResourceRequest(request: Omit<ResourceRequest, "id" | "createdAt">): Promise<ResourceRequest> {
    const [newRequest] = await db.insert(resourceRequests)
      .values({
        ...request,
        status: request.status || 'pending', // Ensure default status
        createdAt: new Date()
      })
      .returning();
      
    return newRequest;
  }

  async updateResourceRequestStatus(requestId: number, status: string): Promise<ResourceRequest | undefined> {
    const [request] = await db.update(resourceRequests)
      .set({ status })
      .where(eq(resourceRequests.id, requestId))
      .returning();
      
    return request;
  }

  // Donation operations
  async getDonations(donorId?: number, recipientId?: number): Promise<Donation[]> {
    let query = db.select().from(donations);
    
    if (donorId !== undefined) {
      query = query.where(eq(donations.donorId, donorId));
    }
    
    if (recipientId !== undefined) {
      query = query.where(eq(donations.recipientId, recipientId));
    }
    
    return query.orderBy(desc(donations.createdAt));
  }

  async createDonation(donation: Omit<Donation, "id" | "createdAt">): Promise<Donation> {
    const [newDonation] = await db.insert(donations)
      .values({
        ...donation,
        status: donation.status || 'pending', // Ensure default status
        createdAt: new Date()
      })
      .returning();
      
    return newDonation;
  }

  async updateDonationStatus(donationId: number, status: string): Promise<Donation | undefined> {
    const [donation] = await db.update(donations)
      .set({ status })
      .where(eq(donations.id, donationId))
      .returning();
      
    return donation;
  }

  // Volunteer operations
  async getVolunteers(fireStationId?: number): Promise<Volunteer[]> {
    if (fireStationId !== undefined) {
      return db.select()
        .from(volunteers)
        .where(eq(volunteers.fireStationId, fireStationId));
    }
    
    return db.select().from(volunteers);
  }

  async createVolunteer(volunteer: Omit<Volunteer, "id">): Promise<Volunteer> {
    const [newVolunteer] = await db.insert(volunteers)
      .values({
        ...volunteer,
        status: volunteer.status || 'active' // Ensure default status
      })
      .returning();
      
    return newVolunteer;
  }

  async updateVolunteerStatus(volunteerId: number, status: string): Promise<Volunteer | undefined> {
    const [volunteer] = await db.update(volunteers)
      .set({ status })
      .where(eq(volunteers.id, volunteerId))
      .returning();
      
    return volunteer;
  }

  // Emergency operations
  async getEmergencies(status?: string): Promise<Emergency[]> {
    if (status !== undefined) {
      return db.select()
        .from(emergencies)
        .where(eq(emergencies.status, status))
        .orderBy(desc(emergencies.createdAt));
    }
    
    return db.select()
      .from(emergencies)
      .orderBy(desc(emergencies.createdAt));
  }

  async createEmergency(emergency: Omit<Emergency, "id" | "createdAt">): Promise<Emergency> {
    const [newEmergency] = await db.insert(emergencies)
      .values({
        ...emergency,
        status: emergency.status || 'active', // Ensure default status
        createdAt: new Date()
      })
      .returning();
      
    return newEmergency;
  }

  async updateEmergencyStatus(emergencyId: number, status: string): Promise<Emergency | undefined> {
    const [emergency] = await db.update(emergencies)
      .set({ status })
      .where(eq(emergencies.id, emergencyId))
      .returning();
      
    return emergency;
  }

  // Notification operations
  async getNotificationsForUser(userId: number): Promise<Notification[]> {
    return db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: Omit<Notification, "id" | "createdAt">): Promise<Notification> {
    const [newNotification] = await db.insert(notifications)
      .values({
        ...notification,
        read: false,
        createdAt: new Date()
      })
      .returning();
      
    return newNotification;
  }

  async markNotificationAsRead(notificationId: number): Promise<Notification | undefined> {
    const [notification] = await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId))
      .returning();
      
    return notification;
  }
}