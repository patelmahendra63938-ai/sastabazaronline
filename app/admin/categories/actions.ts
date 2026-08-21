'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const ADMIN_ROLES = ['admin', 'super_admin', 'staff'] as const;

type CategoryUpdates = {
  is_active?: boolean;
  show_on_homepage?: boolean;
  homepage_featured?: boolean;
  homepage_display_order?: number;
  homepage_image_url?: string | null;
};

async function getAuthorizedSupabase() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Safe in Server Action / Server Component contexts.
          }
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Admin authentication is required.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role;

  if (
    profileError ||
    !role ||
    !ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])
  ) {
    throw new Error('You are not authorized to manage categories.');
  }

  return supabase;
}

function revalidateCategoryPages() {
  revalidatePath('/');
  revalidatePath('/admin/categories');
}

export async function listCategoriesAction() {
  try {
    const supabase = await getAuthorizedSupabase();

    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select(
        'id, name, is_active, display_order, show_on_homepage, homepage_featured, homepage_display_order, homepage_image_url, created_at'
      )
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (catError) throw catError;

    const { data: prodData, error: prodError } = await supabase
      .from('products')
      .select('category');

    if (prodError) throw prodError;

    const counts: Record<string, number> = {};

    (prodData || []).forEach((product: { category?: string | null }) => {
      if (product.category) {
        counts[product.category] = (counts[product.category] || 0) + 1;
      }
    });

    const categories = (catData || []).map((category) => ({
      ...category,
      productCount: counts[category.name] || 0,
    }));

    return { success: true, categories };
  } catch (error) {
    console.error('[CATEGORY_LIST_ERROR]', error);
    return {
      success: false,
      categories: null,
      error: error instanceof Error ? error.message : 'Failed to load categories.',
    };
  }
}

export async function addCategoryAction(input: {
  name: string;
  display_order: number;
  homepage_display_order: number;
}) {
  try {
    const supabase = await getAuthorizedSupabase();
    const name = input.name.trim();

    if (!name) {
      return { success: false, error: 'Category name is required.' };
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name,
        is_active: true,
        show_on_homepage: true,
        homepage_featured: false,
        display_order: input.display_order,
        homepage_display_order: input.homepage_display_order,
      })
      .select(
        'id, name, is_active, display_order, show_on_homepage, homepage_featured, homepage_display_order, homepage_image_url, created_at'
      )
      .single();

    if (error) throw error;

    revalidateCategoryPages();

    return { success: true, category: data };
  } catch (error) {
    console.error('[CATEGORY_ADD_ERROR]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add category.',
    };
  }
}

export async function updateCategoryAction(
  id: string,
  updates: CategoryUpdates
) {
  try {
    const supabase = await getAuthorizedSupabase();

    if (!id) {
      return { success: false, error: 'Category id is required.' };
    }

    const safeUpdates: CategoryUpdates = {};

    if (typeof updates.is_active === 'boolean') {
      safeUpdates.is_active = updates.is_active;
    }

    if (typeof updates.show_on_homepage === 'boolean') {
      safeUpdates.show_on_homepage = updates.show_on_homepage;
    }

    if (typeof updates.homepage_featured === 'boolean') {
      safeUpdates.homepage_featured = updates.homepage_featured;
    }

    if (
      updates.homepage_display_order !== undefined &&
      Number.isInteger(updates.homepage_display_order) &&
      updates.homepage_display_order >= 0
    ) {
      safeUpdates.homepage_display_order = updates.homepage_display_order;
    }

    if (updates.homepage_image_url !== undefined) {
      safeUpdates.homepage_image_url =
        updates.homepage_image_url?.trim() || null;
    }

    if (Object.keys(safeUpdates).length === 0) {
      return { success: false, error: 'No valid category changes were supplied.' };
    }

    const { data, error } = await supabase
      .from('categories')
      .update(safeUpdates)
      .eq('id', id)
      .select(
        'id, name, is_active, display_order, show_on_homepage, homepage_featured, homepage_display_order, homepage_image_url, created_at'
      )
      .single();

    if (error) throw error;

    revalidateCategoryPages();

    return { success: true, category: data };
  } catch (error) {
    console.error('[CATEGORY_UPDATE_ERROR]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update category.',
    };
  }
}

export async function deleteCategoryAction(id: string) {
  try {
    const supabase = await getAuthorizedSupabase();

    if (!id) {
      return { success: false, error: 'Category id is required.' };
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidateCategoryPages();

    return { success: true };
  } catch (error) {
    console.error('[CATEGORY_DELETE_ERROR]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete category.',
    };
  }
}