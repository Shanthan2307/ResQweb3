import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Loader2 } from "lucide-react";
import { useAuth, RegisterData } from "@/hooks/use-auth";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  userType: z.enum(["local", "firestation", "ngo"], {
    required_error: "Please select a user type",
  }),
  pinCode: z.string().optional(),
  pinCodeRangeStart: z.string().optional(),
  pinCodeRangeEnd: z.string().optional(),
  registrationId: z.string().optional(),
  specialization: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine(
  data => {
    if (data.userType === "local") {
      return !!data.pinCode;
    }
    return true;
  },
  {
    message: "PIN code is required for local users",
    path: ["pinCode"],
  }
).refine(
  data => {
    if (data.userType === "firestation") {
      return !!data.pinCodeRangeStart && !!data.pinCodeRangeEnd;
    }
    return true;
  },
  {
    message: "PIN code range is required for fire stations",
    path: ["pinCodeRangeStart", "pinCodeRangeEnd"],
  }
).refine(
  data => {
    if (data.userType === "firestation") {
      return !!data.registrationId;
    }
    return true;
  },
  {
    message: "Registration/License ID is required for fire stations",
    path: ["registrationId"],
  }
).refine(
  data => {
    if (data.userType === "ngo") {
      return !!data.pinCode && !!data.registrationId && !!data.specialization;
    }
    return true;
  },
  {
    message: "PIN code, Registration ID and Specialization are required for NGOs",
    path: ["pinCode", "registrationId", "specialization"],
  }
);

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  
  // Create forms
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      confirmPassword: "",
      userType: "local",
      pinCode: "",
      pinCodeRangeStart: "",
      pinCodeRangeEnd: "",
      registrationId: "",
      specialization: "",
    },
  });
  
  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loginMutation.isPending && !registerMutation.isPending) {
      navigate("/dashboard");
    }
  }, [user, loginMutation.isPending, registerMutation.isPending, navigate]);
  
  // Handle login
  const onLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };
  
  // Handle registration
  const onRegister = (data: RegisterFormData) => {
    const registerData: RegisterData = {
      name: data.name,
      username: data.username,
      password: data.password,
      confirmPassword: data.confirmPassword,
      userType: data.userType,
      pinCode: (data.userType === "local" || data.userType === "ngo") ? data.pinCode : undefined,
      pinCodeRangeStart: data.userType === "firestation" ? data.pinCodeRangeStart : undefined,
      pinCodeRangeEnd: data.userType === "firestation" ? data.pinCodeRangeEnd : undefined,
      registrationId: (data.userType === "firestation" || data.userType === "ngo") ? data.registrationId : undefined,
      specialization: data.userType === "ngo" ? data.specialization : undefined,
    };
    
    registerMutation.mutate(registerData);
  };
  
  // Monitor userType for conditional fields
  const userType = registerForm.watch("userType");
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900 p-4 md:p-0">
      <Card className="w-full max-w-md shadow-xl overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger 
              value="login" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-primary-700 py-4"
            >
              Login
            </TabsTrigger>
            <TabsTrigger 
              value="register" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-primary-700 py-4"
            >
              Register
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="p-0">
            <CardContent className="p-6">
              <div className="flex justify-center mb-6">
                <div className="flex items-center">
                  <Flame className="h-8 w-8 text-primary-700" />
                  <span className="text-xl ml-2 text-primary-700 font-bold">RESQ</span>
                </div>
              </div>
              
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your username" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-red-900 hover:bg-primary-700" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Sign In
                  </Button>
                </form>
              </Form>
            </CardContent>
          </TabsContent>
          
          <TabsContent value="register" className="p-0">
            <CardContent className="p-6">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="userType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>I am a:</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select user type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="local">Local Resident</SelectItem>
                            <SelectItem value="firestation">Fire Station</SelectItem>
                            <SelectItem value="ngo">NGO</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {userType === "local" && (
                    <FormField
                      control={registerForm.control}
                      name="pinCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PIN Code</FormLabel>
                          <FormControl>
                            <Input placeholder="123456" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {userType === "firestation" && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="pinCodeRangeStart"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PIN Code Range Start</FormLabel>
                              <FormControl>
                                <Input placeholder="110001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="pinCodeRangeEnd"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PIN Code Range End</FormLabel>
                              <FormControl>
                                <Input placeholder="110020" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={registerForm.control}
                        name="registrationId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fire Station Registration/License ID</FormLabel>
                            <FormControl>
                              <Input placeholder="FS12345678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  
                  {userType === "ngo" && (
                    <>
                      <FormField
                        control={registerForm.control}
                        name="pinCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PIN Code</FormLabel>
                            <FormControl>
                              <Input placeholder="123456" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="registrationId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>NGO Registration ID</FormLabel>
                            <FormControl>
                              <Input placeholder="NGO12345678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="specialization"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>NGO Specialization</FormLabel>
                            <FormControl>
                              <Input placeholder="Fire relief, Medical supplies, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-red-900 hover:bg-primary-700" 
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Create Account
                  </Button>
                </form>
              </Form>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
