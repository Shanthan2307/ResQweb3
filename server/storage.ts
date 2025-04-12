import { 
  type User, type Resource, type ResourceRequest, type Donation, type Volunteer, 
  type Emergency, type Notification, type InsertUser 
} from "@shared/schema";
import session from "express-session";
import { DatabaseStorage } from "./database-storage";

// Interface defining all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserWalletBalance(userId: number, amount: number): Promise<User | undefined>;
  getFireStationsByPinCode(pinCode: string): Promise<User | undefined>;
  getAllFireStations(): Promise<User[]>;
  getAllNGOs(): Promise<User[]>;
  
  // Resource operations
  getResources(ownerId: number): Promise<Resource[]>;
  createResource(resource: Omit<Resource, "id">): Promise<Resource>;
  updateResourceQuantity(resourceId: number, newQuantity: number): Promise<Resource | undefined>;
  
  // Resource request operations
  getResourceRequests(requesterId?: number, status?: string): Promise<ResourceRequest[]>;
  createResourceRequest(request: Omit<ResourceRequest, "id" | "createdAt">): Promise<ResourceRequest>;
  updateResourceRequestStatus(requestId: number, status: string): Promise<ResourceRequest | undefined>;
  
  // Donation operations
  getDonations(donorId?: number, recipientId?: number): Promise<Donation[]>;
  createDonation(donation: Omit<Donation, "id" | "createdAt">): Promise<Donation>;
  updateDonationStatus(donationId: number, status: string): Promise<Donation | undefined>;
  
  // Volunteer operations
  getVolunteers(fireStationId: number): Promise<Volunteer[]>;
  createVolunteer(volunteer: Omit<Volunteer, "id">): Promise<Volunteer>;
  updateVolunteerStatus(volunteerId: number, status: string): Promise<Volunteer | undefined>;
  
  // Emergency operations
  getEmergencies(status?: string): Promise<Emergency[]>;
  createEmergency(emergency: Omit<Emergency, "id" | "createdAt">): Promise<Emergency>;
  updateEmergencyStatus(emergencyId: number, status: string): Promise<Emergency | undefined>;
  
  // Notification operations
  getNotificationsForUser(userId: number): Promise<Notification[]>;
  createNotification(notification: Omit<Notification, "id" | "createdAt">): Promise<Notification>;
  markNotificationAsRead(notificationId: number): Promise<Notification | undefined>;
  
  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private resources: Map<number, Resource>;
  private resourceRequests: Map<number, ResourceRequest>;
  private donations: Map<number, Donation>;
  private volunteers: Map<number, Volunteer>;
  private emergencies: Map<number, Emergency>;
  private notifications: Map<number, Notification>;
  
  sessionStore: session.Store;
  currentId: { [key: string]: number };

  constructor() {
    this.users = new Map();
    this.resources = new Map();
    this.resourceRequests = new Map();
    this.donations = new Map();
    this.volunteers = new Map();
    this.emergencies = new Map();
    this.notifications = new Map();
    
    this.currentId = {
      users: 1,
      resources: 1,
      resourceRequests: 1,
      donations: 1,
      volunteers: 1,
      emergencies: 1,
      notifications: 1
    };
    
    // In a real implementation, this would use a proper memory store
    // For now, we're using the DatabaseStorage implementation anyway
    this.sessionStore = {} as session.Store;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user: User = { 
      ...insertUser, 
      id, 
      walletBalance: 0, 
      assignedFireStationId: null,
      // Ensure these new fields have proper null values if they're undefined
      pinCode: insertUser.pinCode || null,
      pinCodeRangeStart: insertUser.pinCodeRangeStart || null,
      pinCodeRangeEnd: insertUser.pinCodeRangeEnd || null,
      registrationId: insertUser.registrationId || null,
      specialization: insertUser.specialization || null
    };
    
    // If user is local, assign a fire station based on PIN code
    if (insertUser.userType === 'local' && insertUser.pinCode) {
      const fireStation = await this.getFireStationsByPinCode(insertUser.pinCode);
      if (fireStation) {
        user.assignedFireStationId = fireStation.id;
      }
    }
    
    this.users.set(id, user);
    return user;
  }

  async updateUserWalletBalance(userId: number, amount: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    user.walletBalance = (user.walletBalance || 0) + amount;
    this.users.set(userId, user);
    return user;
  }

  async getFireStationsByPinCode(pinCode: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => 
        user.userType === 'firestation' && 
        user.pinCodeRangeStart && 
        user.pinCodeRangeEnd &&
        pinCode >= user.pinCodeRangeStart && 
        pinCode <= user.pinCodeRangeEnd
    );
  }

  async getAllFireStations(): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      user => user.userType === 'firestation'
    );
  }

  async getAllNGOs(): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      user => user.userType === 'ngo'
    );
  }

  // Resource methods
  async getResources(ownerId?: number): Promise<Resource[]> {
    const resources = Array.from(this.resources.values());
    
    if (ownerId !== undefined) {
      return resources.filter(resource => resource.ownerId === ownerId);
    }
    
    return resources;
  }

  async createResource(resource: Omit<Resource, "id">): Promise<Resource> {
    const id = this.currentId.resources++;
    const newResource: Resource = { ...resource, id };
    this.resources.set(id, newResource);
    return newResource;
  }

  async updateResourceQuantity(resourceId: number, newQuantity: number): Promise<Resource | undefined> {
    const resource = this.resources.get(resourceId);
    if (!resource) return undefined;
    
    resource.quantity = newQuantity;
    this.resources.set(resourceId, resource);
    return resource;
  }

  // Resource request methods
  async getResourceRequests(requesterId?: number, status?: string): Promise<ResourceRequest[]> {
    let requests = Array.from(this.resourceRequests.values());
    
    if (requesterId !== undefined) {
      requests = requests.filter(request => request.requesterId === requesterId);
    }
    
    if (status !== undefined) {
      requests = requests.filter(request => request.status === status);
    }
    
    return requests;
  }

  async createResourceRequest(request: Omit<ResourceRequest, "id" | "createdAt">): Promise<ResourceRequest> {
    const id = this.currentId.resourceRequests++;
    const newRequest: ResourceRequest = { 
      ...request, 
      id, 
      createdAt: new Date()
    };
    
    this.resourceRequests.set(id, newRequest);
    return newRequest;
  }

  async updateResourceRequestStatus(requestId: number, status: string): Promise<ResourceRequest | undefined> {
    const request = this.resourceRequests.get(requestId);
    if (!request) return undefined;
    
    request.status = status;
    this.resourceRequests.set(requestId, request);
    return request;
  }

  // Donation methods
  async getDonations(donorId?: number, recipientId?: number): Promise<Donation[]> {
    let donations = Array.from(this.donations.values());
    
    if (donorId !== undefined) {
      donations = donations.filter(donation => donation.donorId === donorId);
    }
    
    if (recipientId !== undefined) {
      donations = donations.filter(donation => donation.recipientId === recipientId);
    }
    
    return donations;
  }

  async createDonation(donation: Omit<Donation, "id" | "createdAt">): Promise<Donation> {
    const id = this.currentId.donations++;
    const newDonation: Donation = { 
      ...donation, 
      id, 
      createdAt: new Date()
    };
    
    this.donations.set(id, newDonation);
    return newDonation;
  }

  async updateDonationStatus(donationId: number, status: string): Promise<Donation | undefined> {
    const donation = this.donations.get(donationId);
    if (!donation) return undefined;
    
    donation.status = status;
    this.donations.set(donationId, donation);
    return donation;
  }

  // Volunteer methods
  async getVolunteers(fireStationId?: number): Promise<Volunteer[]> {
    let volunteers = Array.from(this.volunteers.values());
    
    if (fireStationId !== undefined) {
      volunteers = volunteers.filter(volunteer => volunteer.fireStationId === fireStationId);
    }
    
    return volunteers;
  }

  async createVolunteer(volunteer: Omit<Volunteer, "id">): Promise<Volunteer> {
    const id = this.currentId.volunteers++;
    const newVolunteer: Volunteer = { ...volunteer, id };
    this.volunteers.set(id, newVolunteer);
    return newVolunteer;
  }

  async updateVolunteerStatus(volunteerId: number, status: string): Promise<Volunteer | undefined> {
    const volunteer = this.volunteers.get(volunteerId);
    if (!volunteer) return undefined;
    
    volunteer.status = status;
    this.volunteers.set(volunteerId, volunteer);
    return volunteer;
  }

  // Emergency methods
  async getEmergencies(status?: string): Promise<Emergency[]> {
    let emergencies = Array.from(this.emergencies.values());
    
    if (status !== undefined) {
      emergencies = emergencies.filter(emergency => emergency.status === status);
    }
    
    return emergencies;
  }

  async createEmergency(emergency: Omit<Emergency, "id" | "createdAt">): Promise<Emergency> {
    const id = this.currentId.emergencies++;
    const newEmergency: Emergency = { 
      ...emergency, 
      id, 
      createdAt: new Date()
    };
    
    this.emergencies.set(id, newEmergency);
    return newEmergency;
  }

  async updateEmergencyStatus(emergencyId: number, status: string): Promise<Emergency | undefined> {
    const emergency = this.emergencies.get(emergencyId);
    if (!emergency) return undefined;
    
    emergency.status = status;
    this.emergencies.set(emergencyId, emergency);
    return emergency;
  }

  // Notification methods
  async getNotificationsForUser(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(
      notification => notification.userId === userId
    );
  }

  async createNotification(notification: Omit<Notification, "id" | "createdAt">): Promise<Notification> {
    const id = this.currentId.notifications++;
    const newNotification: Notification = { 
      ...notification, 
      id, 
      read: false, 
      createdAt: new Date()
    };
    
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async markNotificationAsRead(notificationId: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(notificationId);
    if (!notification) return undefined;
    
    notification.read = true;
    this.notifications.set(notificationId, notification);
    return notification;
  }
}

// Use DatabaseStorage instead of MemStorage for persistent storage
export const storage = new DatabaseStorage();
