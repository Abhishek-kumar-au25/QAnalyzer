// src/app/(auth)/signup/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, type SignUpFormValues } from '@/types/auth';
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
import { Loader2 } from 'lucide-react';
import { GoogleIcon } from '@/components/icons/google-icon';

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: SignUpFormValues) => {
    setIsLoading(true);
    try {
      await signUp(values); // Pass all values including displayName
    } catch (error) {
      console.error("Sign up failed on page:", error);
    } finally {
      setIsLoading(false);
    }
  };

   const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign up/in failed on page:", error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-sm w-full shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl">Sign Up</CardTitle>
        <CardDescription>
          Enter your information to create an account or use a social provider.
        </CardDescription>
      </CardHeader>
      <CardContent>
         <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
             <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} disabled={isLoading || isGoogleLoading}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
             <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="m@example.com" {...field} type="email" disabled={isLoading || isGoogleLoading}/>
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
             <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} disabled={isLoading || isGoogleLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" variant="default" disabled={isLoading || isGoogleLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create an account
            </Button>
           </form>
         </Form>

         <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Button variant="outline" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="mr-2 h-4 w-4" />
            )}
            Google
          </Button>
        </div>

      </CardContent>
       <CardFooter className="flex justify-center text-sm">
         Already have an account?{" "}
          <Link href="/login" className="underline ml-1">
            Sign in
          </Link>
       </CardFooter>
    </Card>
  );
}
