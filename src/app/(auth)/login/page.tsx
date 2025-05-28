// src/app/(auth)/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, type SignInFormValues } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Mail, Phone } from 'lucide-react';
import { GoogleIcon } from '@/components/icons/google-icon';
import PhoneNumberInput from '@/components/feature/auth/phone-number-input';
import OtpInput from '@/components/feature/auth/otp-input';
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase.config'; // Import auth for RecaptchaVerifier
import { useToast } from '@/hooks/use-toast'; // Import useToast

export default function LoginPage() {
  const [loginMode, setLoginMode] = useState<'email' | 'phone'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signIn, signInWithGoogle, signInWithPhoneNumber, confirmOtp, mapFirebaseAuthError } = useAuth(); // Added mapFirebaseAuthError from context
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [appVerifier, setAppVerifier] = useState<RecaptchaVerifier | null>(null);
  const { toast } = useToast(); // Initialize useToast

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Initialize reCAPTCHA verifier
  useEffect(() => {
    let verifierInstance: RecaptchaVerifier | null = null;

    if (typeof window !== 'undefined' && loginMode === 'phone' && !showOtpInput) {
      // Clear any previous verifier instance from window or state if it exists
      // @ts-ignore
      if (window.recaptchaVerifier && typeof window.recaptchaVerifier.clear === 'function') {
         // @ts-ignore
        window.recaptchaVerifier.clear();
      }
      if (appVerifier && typeof appVerifier.clear === 'function') {
          appVerifier.clear();
      }

      try {
        // Dynamically import RecaptchaVerifier to avoid SSR issues
        import('firebase/auth').then(({ RecaptchaVerifier: FirebaseRecaptchaVerifier }) => {
            verifierInstance = new FirebaseRecaptchaVerifier(auth, 'recaptcha-container-login', {
            'size': 'invisible',
            'callback': (response: any) => {
                // reCAPTCHA solved.
            },
            'expired-callback': () => {
                toast({
                title: 'reCAPTCHA Expired',
                description: 'Please try sending the OTP again.',
                variant: 'destructive',
                });
                setAppVerifier(null); 
            }
            });

            verifierInstance.render().then((widgetId) => {
            // @ts-ignore
            window.recaptchaWidgetId = widgetId; 
            setAppVerifier(verifierInstance);
            }).catch((error: any) => {
            console.error("reCAPTCHA render error:", error);
            toast({
                title: 'reCAPTCHA Setup Error',
                description: `Could not render reCAPTCHA. ${mapFirebaseAuthError(error.code || 'auth/internal-error')}`,
                variant: 'destructive',
            });
            setAppVerifier(null);
            });
        }).catch(error => {
            console.error("Error dynamically importing RecaptchaVerifier:", error);
            toast({
                title: 'reCAPTCHA Library Error',
                description: 'Failed to load reCAPTCHA library.',
                variant: 'destructive',
            });
            setAppVerifier(null);
        });

      } catch (error: any) {
          console.error("Error initializing RecaptchaVerifier:", error);
           toast({
            title: 'reCAPTCHA Initialization Failed',
            description: mapFirebaseAuthError(error.code || 'auth/internal-error'),
            variant: 'destructive',
          });
          setAppVerifier(null);
      }
    }

    return () => {
      if (verifierInstance && typeof verifierInstance.clear === 'function') {
        verifierInstance.clear();
      }
      if (appVerifier && appVerifier !== verifierInstance && typeof appVerifier.clear === 'function') {
        appVerifier.clear();
      }
      if (loginMode !== 'phone' || showOtpInput) {
        setAppVerifier(null);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginMode, showOtpInput, toast, mapFirebaseAuthError]); // Removed auth from deps as it's stable


  const onEmailSubmit = async (values: SignInFormValues) => {
    setIsLoading(true);
    try {
      await signIn(values);
    } catch (error) {
      console.error("Sign in failed on page:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign in failed on page:", error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSendOtp = async (phoneNumber: string) => {
     setIsLoading(true);
     if (!appVerifier) {
        console.error("reCAPTCHA verifier not initialized or not ready.");
        toast({ 
            title: "reCAPTCHA Not Ready",
            description: "Please wait a moment for reCAPTCHA to initialize or try the 'Retry reCAPTCHA' button below.",
            variant: 'destructive'
        });
        setIsLoading(false);
        return;
     }
     try {
       const result = await signInWithPhoneNumber(phoneNumber, appVerifier);
       setConfirmationResult(result);
       setShowOtpInput(true);
     } catch (error: any) { // Added type annotation for error
       console.error("Error sending OTP on page:", error);
       if (appVerifier && typeof appVerifier.clear === 'function') {
           appVerifier.clear();
       }
       setAppVerifier(null); // Reset state to allow re-initialization by useEffect
       // Error is handled by toast in AuthContext's signInWithPhoneNumber
     } finally {
       setIsLoading(false);
     }
  };

   const handleVerifyOtp = async (otp: string) => {
    setIsLoading(true);
    if (!confirmationResult) {
        console.error("No confirmation result to verify OTP.");
        toast({
            title: "OTP Error",
            description: "No active OTP session. Please try sending OTP again.",
            variant: 'destructive'
        });
        setIsLoading(false);
        return;
    }
    try {
      await confirmOtp(confirmationResult, otp);
      // Success: User signed in, redirect handled by AuthProvider
      setShowOtpInput(false);
      setConfirmationResult(null);
      // appVerifier is cleaned up by useEffect when showOtpInput changes
    } catch (error) {
       console.error("OTP verification failed on page:", error);
       // Error is handled by toast in AuthContext's confirmOtp
    } finally {
       setIsLoading(false);
    }
  };


  return (
    <Card className="mx-auto max-w-sm w-full shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>
          {loginMode === 'email' && !showOtpInput && 'Enter your email below to login to your account.'}
          {loginMode === 'phone' && !showOtpInput && 'Enter your phone number to receive an OTP.'}
          {showOtpInput && 'Enter the OTP sent to your phone.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Login Form */}
        {loginMode === 'email' && !showOtpInput && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEmailSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m@example.com" {...field} type="email" disabled={isLoading || isGoogleLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} disabled={isLoading || isGoogleLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" variant="default" disabled={isLoading || isGoogleLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login with Email
              </Button>
            </form>
          </Form>
        )}

        {/* Phone Login Form */}
        {loginMode === 'phone' && !showOtpInput && (
            <PhoneNumberInput onSubmitPhoneNumber={handleSendOtp} isLoading={isLoading} />
        )}

         {/* OTP Input Form */}
        {showOtpInput && loginMode === 'phone' && (
             <OtpInput onSubmitOtp={handleVerifyOtp} isLoading={isLoading} />
        )}


        {/* Separator and Social/Alternative Logins */}
        {!showOtpInput && (
            <>
                <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                    </span>
                </div>
                </div>

                <div className="grid gap-4">
                     {loginMode === 'email' && (
                         <Button variant="outline" onClick={() => {setLoginMode('phone'); form.reset(); setShowOtpInput(false);}} disabled={isLoading || isGoogleLoading}>
                            <Phone className="mr-2 h-4 w-4" />
                            Sign in with Phone
                        </Button>
                    )}
                     {loginMode === 'phone' && (
                        <Button variant="outline" onClick={() => {
                            setLoginMode('email'); 
                            if (appVerifier && typeof appVerifier.clear === 'function') appVerifier.clear(); 
                            setAppVerifier(null);
                            setShowOtpInput(false);
                        }} disabled={isLoading || isGoogleLoading}>
                            <Mail className="mr-2 h-4 w-4" />
                            Sign in with Email
                        </Button>
                     )}

                    <Button variant="outline" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                        {isGoogleLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                        <GoogleIcon className="mr-2 h-4 w-4" />
                        )}
                        Google
                    </Button>
                </div>
            </>
        )}

      </CardContent>
       <CardFooter className="flex flex-col items-center text-sm space-y-2">
         <p>
         Don&apos;t have an account?{" "}
          <Link href="/signup" className="underline ml-1">
            Sign up
          </Link>
         </p>
        {loginMode === 'phone' && !showOtpInput && (
             <Button variant="link" size="sm" onClick={() => {
                if (appVerifier && typeof appVerifier.clear === 'function') {
                    try {
                        appVerifier.clear();
                    } catch (e) {
                        console.error("Error clearing appVerifier on retry:", e);
                    }
                }
                setAppVerifier(null); 
                toast({ title: "reCAPTCHA Reset", description: "Attempting to re-initialize reCAPTCHA. Please try sending OTP again after a moment."});
             }} disabled={isLoading}>
                Problem with reCAPTCHA? Retry.
             </Button>
        )}
       </CardFooter>
       <div id="recaptcha-container-login" className="flex justify-center mt-4"></div>
    </Card>
  );
}
