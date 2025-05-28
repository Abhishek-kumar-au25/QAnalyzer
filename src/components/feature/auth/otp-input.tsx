// src/components/feature/auth/otp-input.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits.'),
});

type OtpFormValues = z.infer<typeof otpSchema>;

interface OtpInputProps {
  onSubmitOtp: (otp: string) => Promise<void>;
  isLoading: boolean;
}

export default function OtpInput({ onSubmitOtp, isLoading }: OtpInputProps) {
  const form = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  });

  const handleFormSubmit = async (values: OtpFormValues) => {
    await onSubmitOtp(values.otp);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="otp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Enter OTP</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  {...field}
                  disabled={isLoading}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="text-center tracking-[0.3em] font-mono text-lg" // Enhanced styling
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" variant="outline" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Verifying...' : 'Verify OTP'}
        </Button>
      </form>
    </Form>
  );
}
