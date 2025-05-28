
// src/contexts/AuthContext.tsx
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile as firebaseUpdateProfile,
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
  type ConfirmationResult,
  type RecaptchaVerifier,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth, db } from '@/lib/firebase/firebase.config'; // Import db for Firestore operations
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'; // Firestore imports for saving user data
import type { SignUpFormValues, SignInFormValues } from '@/types/auth';
import { redirect, usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// Removed AlertDialog imports as we are switching to snackbar toasts

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (values: SignUpFormValues) => Promise<void>;
  signIn: (values: SignInFormValues) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateUserProfile: (updates: { photoURL?: string; displayName?: string }) => Promise<void>;
  signInWithPhoneNumber: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  confirmOtp: (confirmationResult: ConfirmationResult, otp: string) => Promise<void>;
  mapFirebaseAuthError: (errorCode: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function mapFirebaseAuthError(errorCode: string): string {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No user found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/email-already-in-use':
      return 'This email address is already in use by another account.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use a stronger password.';
    case 'auth/invalid-api-key':
         return 'Invalid Firebase API Key. Please check your .env configuration.';
    case 'auth/configuration-not-found':
        return 'Firebase configuration error. Ensure Authentication and the specific sign-in provider (e.g., Email/Password, Google, Phone) are enabled and configured correctly in your Firebase project console.';
    case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
    case 'auth/popup-closed-by-user':
        return 'Sign-in popup closed before completion.';
    case 'auth/account-exists-with-different-credential':
        return 'An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.';
    case 'auth/cancelled-popup-request':
        return 'Popup request cancelled. Only one popup request can be open at a time.';
    case 'auth/popup-blocked':
        return 'Popup blocked by browser. Please allow popups for this site.';
    case 'auth/operation-not-allowed':
         return 'Sign-in method is not enabled. Please enable it in the Firebase console.';
    case 'auth/auth-domain-config-required':
         return 'Authentication domain configuration is required. Check your Firebase setup.';
    case 'auth/unauthorized-domain':
         return 'This domain is not authorized for OAuth operations for your Firebase project. Check the authorized domains in the Firebase console Authentication settings.';
    case 'auth/missing-phone-number':
        return 'Missing phone number. Please provide a valid phone number.';
    case 'auth/invalid-phone-number':
        return 'Invalid phone number format. Ensure it includes the country code (e.g., +1234567890).';
    case 'auth/quota-exceeded':
        return 'SMS quota exceeded for this project or phone number. Please try again later or contact Firebase support.';
    case 'auth/user-cancelled':
        return 'User cancelled the phone number verification process.';
    case 'auth/missing-verification-code':
        return 'Missing verification code. Please enter the OTP.';
    case 'auth/invalid-verification-code':
        return 'Invalid verification code. Please enter the correct OTP.';
    case 'auth/code-expired':
        return 'The verification code has expired. Please request a new one.';
    case 'auth/captcha-check-failed':
         return 'reCAPTCHA verification failed. Please try again or ensure reCAPTCHA is configured correctly for your domain in the Google Cloud Console.';
    case 'auth/invalid-recaptcha-token':
         return 'Invalid reCAPTCHA token. Please refresh and try again.';
    case 'auth/missing-recaptcha-token':
          return 'Missing reCAPTCHA token. Please complete the verification.';
    case 'auth/internal-error':
      return 'An internal authentication error occurred. This might be due to reCAPTCHA setup (ensure reCAPTCHA Enterprise API is enabled in Google Cloud, site key is configured for your domain and linked to Firebase), Firebase project configuration for Phone Sign-in (ensure it is enabled and your domain is an Authorized Domain in Firebase Authentication settings), or a temporary service issue. Please try again or contact support if the problem persists.';
    default:
      console.warn("Unhandled Firebase Auth Error Code:", errorCode);
      return `An authentication error occurred (${errorCode}). Please check your Firebase setup and try again.`;
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast(); // Using the useToast hook for snackbars

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    }, (error) => {
        console.error("Error getting auth state:", error);
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "Could not verify authentication status. Please check your connection or Firebase setup."
        });
        setLoading(false);
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname === '/login' || pathname === '/signup';
      const isRootPage = pathname === '/';
      if (!user && !isAuthPage && !isRootPage) {
        router.push('/login');
      } else if (user && (isAuthPage || isRootPage)) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);


  const signUp = async (values: SignUpFormValues): Promise<void> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const firebaseUser = userCredential.user;
      const displayName = values.displayName || values.email.split('@')[0];

      if (firebaseUser) {
          await firebaseUpdateProfile(firebaseUser, { displayName });

          // Save additional user info to Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          await setDoc(userDocRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: displayName,
            photoURL: firebaseUser.photoURL,
            createdAt: Timestamp.now(),
            signUpMethod: 'Email',
          });

          setUser({ ...firebaseUser, displayName, photoURL: firebaseUser.photoURL });
      }
      toast({ title: "Sign Up Successful", description: "Welcome!" });
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Sign up error:', error);
      let description = "An unknown error occurred.";
      if (error instanceof FirebaseError) {
        description = mapFirebaseAuthError(error.code);
      } else if (error.message) {
        description = error.message;
      }
      toast({ variant: "destructive", title: "Sign Up Failed", description });
      throw error;
    }
  };

  const signIn = async (values: SignInFormValues): Promise<void> => {
     try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      setUser(userCredential.user);
      toast({ title: "Sign In Successful", description: "Welcome back!" });
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Sign in error:', error);
      let description = "An unknown error occurred.";
       if (error instanceof FirebaseError) {
         description = mapFirebaseAuthError(error.code);
       } else if (error.message) {
         description = error.message;
       }
       toast({ variant: "destructive", title: "Sign In Failed", description });
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      router.push('/login');
    } catch (error: any) {
      console.error('Sign out error:', error);
      let description = "An unknown error occurred.";
       if (error instanceof FirebaseError) {
         description = mapFirebaseAuthError(error.code);
       } else if (error.message) {
         description = error.message;
       }
       toast({ variant: "destructive", title: "Sign Out Failed", description });
      throw error;
    }
  };

  const signInWithProvider = async (provider: GoogleAuthProvider, providerName: string): Promise<void> => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      setUser(firebaseUser);

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userDocRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        createdAt: Timestamp.now(),
        signUpMethod: providerName,
      }, { merge: true });

      toast({ title: `${providerName} Sign-In Successful`, description: `Welcome, ${firebaseUser.displayName || firebaseUser.email}!` });
      router.push('/dashboard');
    } catch (error: any) {
      console.error(`${providerName} Sign-in error:`, error);
      let description = "An unknown error occurred.";
       if (error instanceof FirebaseError) {
         description = mapFirebaseAuthError(error.code);
         if (providerName === 'Google' && (error.code === 'auth/operation-not-allowed' || error.code === 'auth/unauthorized-domain' || error.code === 'auth/configuration-not-found')) {
            description += " Please ensure the Google sign-in provider is enabled and your domain is authorized in the Firebase console.";
         }
       } else if (error.message) {
         description = error.message;
       }
       toast({ variant: "destructive", title: `${providerName} Sign-In Failed`, description });
      throw error;
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    await signInWithProvider(provider, "Google");
  };

  const updateUserProfile = async (updates: { photoURL?: string; displayName?: string }): Promise<void> => {
    if (!auth.currentUser) {
      toast({ variant: "destructive", title: "Update Failed", description: "No user is currently signed in."});
      throw new Error("No user is currently signed in.");
    }
    try {
      await firebaseUpdateProfile(auth.currentUser, updates);
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userDocRef, updates, { merge: true });

      setUser(prevUser => {
        if (!prevUser) return null;
        return { ...prevUser, ...updates };
      });
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
    } catch (error: any) {
      console.error('Update profile error:', error);
      let description = "An unknown error occurred while updating profile.";
      if (error instanceof FirebaseError) {
        description = mapFirebaseAuthError(error.code);
      } else if (error.message) {
        description = error.message;
      }
      toast({ variant: "destructive", title: "Update Profile Failed", description });
      throw error;
    }
  };

  const signInWithPhoneNumber = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
    try {
      const confirmationResult = await firebaseSignInWithPhoneNumber(auth, phoneNumber, appVerifier);
      return confirmationResult;
    } catch (error: any) {
      console.error('Phone sign-in error (send OTP):', error);
      if (appVerifier && typeof appVerifier.clear === 'function') {
        try {
            appVerifier.clear();
        } catch (clearError) {
            console.error('Error clearing reCAPTCHA verifier:', clearError);
        }
      }
      let description = "An unknown error occurred while sending OTP.";
      if (error instanceof FirebaseError) {
        description = mapFirebaseAuthError(error.code);
      } else if (error.message) {
        description = error.message;
      }
      toast({ variant: "destructive", title: "Send OTP Failed", description });
      throw error;
    }
  };

  const confirmOtp = async (confirmationResult: ConfirmationResult, otp: string): Promise<void> => {
    try {
      const userCredential = await confirmationResult.confirm(otp);
      const firebaseUser = userCredential.user;
      setUser(firebaseUser);

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userDocRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        phoneNumber: firebaseUser.phoneNumber,
        displayName: firebaseUser.displayName || firebaseUser.phoneNumber,
        photoURL: firebaseUser.photoURL,
        createdAt: Timestamp.now(),
        signUpMethod: 'Phone',
      }, { merge: true });


      toast({ title: "Phone Sign-In Successful", description: "Welcome!" });
      router.push('/dashboard');
    } catch (error: any) {
      console.error('OTP confirmation error:', error);
      let description = "An unknown error occurred while verifying OTP.";
      if (error instanceof FirebaseError) {
        description = mapFirebaseAuthError(error.code);
      } else if (error.message) {
        description = error.message;
      }
      toast({ variant: "destructive", title: "OTP Verification Failed", description });
      throw error;
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, signInWithGoogle, updateUserProfile, signInWithPhoneNumber, confirmOtp, mapFirebaseAuthError }}>
      {children}
      {/* AlertDialog for errors is removed, toasts will be handled by the Toaster component */}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
