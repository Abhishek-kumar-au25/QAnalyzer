
// src/app/(app)/settings/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, UserCog, Bell, Palette, UploadCloud, Edit3, ListChecks, Save, Brush, Sun, Moon, Laptop, Loader2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import CustomThemeForm from '@/components/feature/settings/custom-theme-form';
import { useTheme } from "next-themes";
import { db } from '@/lib/firebase/firebase.config';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';

interface UserSettings {
  reportNotifications: boolean;
  defectNotifications: boolean;
  systemUpdateNotifications: boolean;
}

export default function SettingsPage() {
  const { user, updateUserProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { setTheme } = useTheme();

  const [notifications, setNotifications] = useState<UserSettings>({
    reportNotifications: true,
    defectNotifications: false,
    systemUpdateNotifications: true,
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);

  // Load user profile data and notification settings
  useEffect(() => {
    if (user) {
      setProfileImageUrl(user.photoURL || `https://picsum.photos/seed/${user.uid || 'default-user'}/100/100`);
      setDisplayName(user.displayName || user.email?.split('@')[0] || 'User');

      const fetchSettings = async () => {
        setIsLoadingSettings(true);
        try {
          const settingsRef = doc(db, 'users', user.uid, 'settings', 'notifications');
          const docSnap = await getDoc(settingsRef);
          if (docSnap.exists()) {
            setNotifications(docSnap.data() as UserSettings);
          }
        } catch (error) {
          console.error("Error fetching notification settings:", error);
          toast({ title: "Error", description: "Could not load notification settings.", variant: "destructive" });
        } finally {
          setIsLoadingSettings(false);
        }
      };
      fetchSettings();
    } else if (!authLoading) {
      setIsLoadingSettings(false); // No user, no settings to load
    }
  }, [user, authLoading, toast]);


  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setProfileImageFile(file);
      setProfileImageUrl(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to update your profile." });
      return;
    }
    setIsUpdatingProfile(true);
    const updates: { displayName?: string; photoURL?: string } = {};
    if (displayName !== (user.displayName || user.email?.split('@')[0])) {
      updates.displayName = displayName;
    }

    if (profileImageFile && profileImageUrl && profileImageUrl.startsWith('blob:')) {
      // Simulate upload and get new URL; in a real app, this would upload to Firebase Storage
      // For now, we'll just use a placeholder to show change
      const newSimulatedPhotoUrl = `https://picsum.photos/seed/${user.uid || 'new-avatar'}-${Date.now()}/100/100`;
      updates.photoURL = newSimulatedPhotoUrl;
      // In a real app, you'd call updateUserProfile AFTER successfully uploading the image and getting its URL.
      // For this simulation, we set the preview URL and then call updateUserProfile.
      setProfileImageUrl(newSimulatedPhotoUrl); // Update preview immediately for better UX
    } else if (profileImageUrl && profileImageUrl !== user.photoURL && !profileImageUrl.startsWith('blob:')) {
      // This handles cases where a direct URL might have been pasted (less common for profile pics)
      updates.photoURL = profileImageUrl || undefined;
    }

    if (Object.keys(updates).length === 0 && !profileImageFile) {
      toast({ title: "No Changes", description: "No changes were made to your profile." });
      setIsUpdatingProfile(false);
      return;
    }

    try {
      await updateUserProfile(updates); 
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
      setProfileImageFile(null); // Clear the file input state after "upload"
    } catch (error) {
      console.error("Failed to update profile from settings page:", error);
      // Toast for error is handled in AuthContext's updateUserProfile
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleNotificationChange = async (key: keyof UserSettings, value: boolean) => {
    if (!user) return;
    setIsUpdatingNotifications(true);
    const newSettings = { ...notifications, [key]: value };
    setNotifications(newSettings); // Optimistic update

    try {
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'notifications');
      await setDoc(settingsRef, newSettings, { merge: true });
      toast({ title: "Notification Settings Updated" });
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast({ title: "Error", description: "Failed to save notification settings.", variant: "destructive" });
      // Revert optimistic update on error (optional, could also refetch)
      setNotifications(prev => ({ ...prev, [key]: !value }));
    } finally {
      setIsUpdatingNotifications(false);
    }
  };
  
  if (authLoading || isLoadingSettings) {
    return (
        <div className="container mx-auto py-8 flex justify-center items-center h-[calc(100vh-10rem)]">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }


  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-primary flex items-center"><UserCog className="mr-2 h-5 w-5 text-accent" />User Account & Profile</CardTitle>
            <CardDescription>Manage your personal profile information and account settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-3">
              {profileImageUrl && (
                <Image
                  src={profileImageUrl}
                  alt="Your Profile Avatar"
                  width={100}
                  height={100}
                  className="rounded-full object-cover border-2 border-primary"
                  data-ai-hint="user avatar"
                  key={profileImageUrl} // Force re-render if URL changes
                />
              )}
              <Input
                id="profile-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="text-xs"
                disabled={isUpdatingProfile}
              />
              <Label htmlFor="profile-image-upload" className="text-xs text-muted-foreground">
                Select a new profile image (JPG, PNG).
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                disabled={isUpdatingProfile}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-display">Email</Label>
              <Input
                id="email-display"
                value={user?.email || ''}
                disabled
                readOnly
              />
            </div>
            <Button onClick={handleUpdateProfile} className="w-full" disabled={isUpdatingProfile}>
              {isUpdatingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
            </Button>
            <Button variant="outline" className="w-full" disabled>
              <ListChecks className="mr-2 h-4 w-4" /> View All Users (Admin - TBD)
            </Button>
            <p className="text-xs text-muted-foreground pt-2">
              Full user management including roles, permissions, and editing other user profiles will be available in a dedicated user administration section.
            </p>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-primary flex items-center"><Bell className="mr-2 h-5 w-5 text-accent" />Notification Preferences</CardTitle>
              <CardDescription>Configure how you receive notifications from QAnalyzer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(Object.keys(notifications) as Array<keyof UserSettings>).map((key) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                  <Label htmlFor={key} className="flex-grow pr-2 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').replace('Notifications', '')} Notifications
                  </Label>
                  <Switch
                    id={key}
                    checked={notifications[key]}
                    onCheckedChange={(checked) => handleNotificationChange(key, checked)}
                    aria-label={`Toggle ${key.replace(/([A-Z])/g, ' $1')} notifications`}
                    disabled={isUpdatingNotifications}
                  />
                </div>
              ))}
               {isUpdatingNotifications && 
                <div className="flex items-center justify-center text-xs text-muted-foreground">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin"/> Saving...
                </div>}
            </CardContent>
          </Card>
          <CustomThemeForm />
        </div>
      </div>
      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary flex items-center"><Palette className="mr-2 h-5 w-5 text-accent" />Appearance & Global Theme</CardTitle>
          <CardDescription>
            Select your preferred global theme. This setting syncs with the toggle in the header.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center py-10 space-y-6">
          <Brush className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            Choose a global theme for the application.
          </p>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Button variant="outline" onClick={() => setTheme("light")} className="w-full sm:w-auto">
              <Sun className="mr-2 h-4 w-4" /> Light Mode
            </Button>
            <Button variant="outline" onClick={() => setTheme("dark")} className="w-full sm:w-auto">
              <Moon className="mr-2 h-4 w-4" /> Dark Mode
            </Button>
            <Button variant="outline" onClick={() => setTheme("system")} className="w-full sm:w-auto">
              <Laptop className="mr-2 h-4 w-4" /> System Default
            </Button>
          </div>
           <p className="text-xs text-muted-foreground pt-4">
            For more granular control over specific colors (like primary, accent, background), use the "Customize Theme Colors" section.
          </p>
        </CardContent>
      </Card>
      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary">QAnalyzer Settings Module</CardTitle>
          <CardDescription>
            Fine-tuning the controls for your QAnalyzer experience!
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center py-12">
          <Settings className="h-24 w-24 text-accent mb-6" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Personalize Your QAnalyzer Panel!</h2>
          <p className="text-muted-foreground max-w-md">
            This module allows you to tailor QAnalyzer to your specific needs, from profile settings to notification preferences and appearance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
