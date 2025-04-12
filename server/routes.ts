import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertResourceRequestSchema, 
  insertDonationSchema, 
  insertVolunteerSchema, 
  insertEmergencySchema,
  insertNotificationSchema,
  User
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Fire Station Assignment for local users
  app.get("/api/fire-stations", async (req, res) => {
    try {
      const fireStations = await storage.getAllFireStations();
      res.json(fireStations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch fire stations" });
    }
  });

  app.get("/api/assigned-fire-station", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const user = req.user;
      if (user.userType !== "local" || !user.assignedFireStationId) {
        return res.status(404).json({ message: "No fire station assigned" });
      }
      
      const fireStation = await storage.getUser(user.assignedFireStationId);
      res.json(fireStation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assigned fire station" });
    }
  });

  // Resource Requests
  app.get("/api/resource-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const requesterId = req.query.requesterId ? Number(req.query.requesterId) : undefined;
      const status = req.query.status as string | undefined;
      
      const requests = await storage.getResourceRequests(requesterId, status);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch resource requests" });
    }
  });

  app.post("/api/resource-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const user = req.user;
      if (user.userType !== "firestation") {
        return res.status(403).json({ message: "Only fire stations can create resource requests" });
      }
      
      const validatedData = insertResourceRequestSchema.parse({ 
        ...req.body, 
        requesterId: user.id,
        status: 'pending' // Set default status
      });
      const request = await storage.createResourceRequest(validatedData);
      
      // For now, we'll just consider this a placeholder for future implementation
      // since we don't have a way to efficiently query all users with a specific assignedFireStationId
      const localUsers: User[] = [];
      
      for (const localUser of localUsers) {
        await storage.createNotification({
          userId: localUser.id,
          title: "Resource Request",
          content: `${user.name} is requesting ${validatedData.quantity} ${validatedData.resourceType}`,
          type: "request",
          read: false
        });
      }
      
      // Also notify NGOs
      const ngos = await storage.getAllNGOs();
      for (const ngo of ngos) {
        await storage.createNotification({
          userId: ngo.id,
          title: "Resource Request",
          content: `${user.name} is requesting ${validatedData.quantity} ${validatedData.resourceType}`,
          type: "request",
          read: false
        });
      }
      
      res.status(201).json(request);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request data" });
    }
  });

  app.patch("/api/resource-requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const requestId = Number(req.params.id);
      const status = req.body.status;
      
      if (!["pending", "fulfilled", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedRequest = await storage.updateResourceRequestStatus(requestId, status);
      if (!updatedRequest) {
        return res.status(404).json({ message: "Resource request not found" });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      res.status(500).json({ message: "Failed to update resource request" });
    }
  });

  // Donations
  app.get("/api/donations", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const donorId = req.query.donorId ? Number(req.query.donorId) : undefined;
      const recipientId = req.query.recipientId ? Number(req.query.recipientId) : undefined;
      
      const donations = await storage.getDonations(donorId, recipientId);
      res.json(donations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch donations" });
    }
  });

  app.post("/api/donations", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const user = req.user;
      const validatedData = insertDonationSchema.parse({ 
        ...req.body, 
        donorId: user.id,
        status: 'pending' // Set default status
      });
      
      // If it's a monetary donation, update wallet balances
      if (validatedData.amount && validatedData.currency) {
        // Deduct from donor's wallet
        await storage.updateUserWalletBalance(user.id, -validatedData.amount);
        
        // Add to recipient's wallet
        await storage.updateUserWalletBalance(validatedData.recipientId, validatedData.amount);
      }
      
      const donation = await storage.createDonation(validatedData);
      
      // Create notification for recipient
      const recipient = await storage.getUser(validatedData.recipientId);
      if (recipient) {
        let content = "";
        if (validatedData.resourceType) {
          content = `${user.name} donated ${validatedData.resourceQuantity} ${validatedData.resourceType}`;
        } else {
          content = `${user.name} donated ${validatedData.amount} ${validatedData.currency}`;
        }
        
        await storage.createNotification({
          userId: recipient.id,
          title: "New Donation",
          content,
          type: "donation",
          read: false
        });
      }
      
      res.status(201).json(donation);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid donation data" });
    }
  });

  // Volunteers
  app.get("/api/volunteers", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const fireStationId = req.query.fireStationId ? Number(req.query.fireStationId) : undefined;
      const volunteers = await storage.getVolunteers(fireStationId);
      res.json(volunteers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch volunteers" });
    }
  });

  app.post("/api/volunteers", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const user = req.user;
      if (user.userType !== "local") {
        return res.status(403).json({ message: "Only local users can register as volunteers" });
      }
      
      // If no fire station is provided, use the assigned one
      let fireStationId = req.body.fireStationId;
      if (!fireStationId && user.assignedFireStationId) {
        fireStationId = user.assignedFireStationId;
      }
      
      const validatedData = insertVolunteerSchema.parse({
        ...req.body,
        userId: user.id,
        fireStationId,
        status: 'active' // Set default status
      });
      
      const volunteer = await storage.createVolunteer(validatedData);
      
      // Create notification for fire station
      await storage.createNotification({
        userId: fireStationId,
        title: "New Volunteer",
        content: `${user.name} has registered as a volunteer`,
        type: "volunteer",
        read: false
      });
      
      res.status(201).json(volunteer);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid volunteer data" });
    }
  });

  // Emergencies
  app.get("/api/emergencies", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const status = req.query.status as string | undefined;
      const emergencies = await storage.getEmergencies(status);
      res.json(emergencies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch emergencies" });
    }
  });

  app.post("/api/emergencies", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const user = req.user;
      if (user.userType !== "firestation") {
        return res.status(403).json({ message: "Only fire stations can create emergencies" });
      }
      
      const validatedData = insertEmergencySchema.parse({
        ...req.body,
        reporterId: user.id,
        status: 'active' // Set default status
      });
      
      const emergency = await storage.createEmergency(validatedData);
      
      // Create notifications for all other fire stations
      const otherFireStations = (await storage.getAllFireStations())
        .filter(station => station.id !== user.id);
      
      for (const station of otherFireStations) {
        await storage.createNotification({
          userId: station.id,
          title: "Emergency Alert",
          content: `${user.name} reported: ${validatedData.title}`,
          type: "emergency",
          read: false
        });
      }
      
      res.status(201).json(emergency);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid emergency data" });
    }
  });

  // Notifications
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const notifications = await storage.getNotificationsForUser(req.user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const notificationId = Number(req.params.id);
      const notification = await storage.markNotificationAsRead(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  // Resources
  app.get("/api/resources", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const ownerId = req.query.ownerId ? Number(req.query.ownerId) : undefined;
      const resources = await storage.getResources(ownerId);
      res.json(resources);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
