// src/components/feature/auth/phone-number-input.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
// Removed RecaptchaVerifier import from here as it will be managed by the page

const phoneSchema = z.object({
  phoneNumber: z.string().min(10, 'Please enter a valid phone number including country code (e.g., +1234567890).'),
});

type PhoneFormValues = z.infer<typeof phoneSchema>;

interface PhoneNumberInputProps {
  onSubmitPhoneNumber: (phoneNumber: string) => Promise<void>; // Verifier will be handled by the page
  isLoading: boolean;
}

export default function PhoneNumberInput({ onSubmitPhoneNumber, isLoading }: PhoneNumberInputProps) {
  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });

  const handleFormSubmit = async (values: PhoneFormValues) => {
    await onSubmitPhoneNumber(values.phoneNumber);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="+1 123 456 7890" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* reCAPTCHA container div will be in the LoginPage */}
        <Button type="submit" className="w-full" variant="outline" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Sending...' : 'Send OTP'}
        </Button>
      </form>
    </Form>
  );
}
