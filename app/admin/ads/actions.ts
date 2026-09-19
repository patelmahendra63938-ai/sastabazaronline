'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminUser } from '@/lib/auth';
import { registerMerchantDeveloper } from '@/lib/google/integrations';

export async function registerMerchantDeveloperAction(formData: FormData) {
  await requireAdminUser();

  const developerEmail = String(formData.get('developerEmail') ?? '').trim();
  let status = 'registered';

  try {
    await registerMerchantDeveloper(developerEmail);
    revalidatePath('/admin/ads');
  } catch (error) {
    console.error('Merchant developer registration failed:', error);
    status = 'merchant-registration-failed';
  }

  redirect('/admin/ads?google=' + status);
}
