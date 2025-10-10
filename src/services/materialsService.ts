/**
 * Phase 2: Materials Management Service
 *
 * Service layer for fetching and managing materials data from Supabase.
 * Handles all database queries for material categories and materials.
 */

import { getSupabase } from './supabase';
import type { MaterialCategory, ServiceMaterial, MaterialsByCategory } from '../types/materials';

/**
 * Fetch all material categories for a service
 *
 * @param companyId - Company UUID
 * @param serviceConfigId - Service config UUID
 * @returns Array of material categories ordered by sort_order
 */
export async function fetchMaterialCategories(
  companyId: string,
  serviceConfigId: string
): Promise<{ data: MaterialCategory[] | null; error: string | null }> {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('service_material_categories')
      .select('*')
      .eq('company_id', companyId)
      .eq('service_config_id', serviceConfigId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('❌ Error fetching material categories:', error);
      return { data: null, error: error.message };
    }

    console.log(`✅ Fetched ${data?.length || 0} material categories`);
    return { data: data as MaterialCategory[], error: null };
  } catch (err: any) {
    console.error('❌ Exception fetching material categories:', err);
    return { data: null, error: err.message || 'Unknown error occurred' };
  }
}

/**
 * Fetch materials for a specific category
 *
 * @param companyId - Company UUID
 * @param serviceConfigId - Service config UUID
 * @param categoryKey - Category key (e.g., 'base_rock', 'pavers')
 * @returns Array of materials ordered by is_default (defaults first), then material_name
 */
export async function fetchMaterialsForCategory(
  companyId: string,
  serviceConfigId: string,
  categoryKey: string
): Promise<{ data: ServiceMaterial[] | null; error: string | null }> {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('service_materials')
      .select('*')
      .eq('company_id', companyId)
      .eq('service_config_id', serviceConfigId)
      .eq('material_category', categoryKey)
      .eq('is_active', true)
      .order('is_default', { ascending: false })  // Defaults first
      .order('material_name', { ascending: true });

    if (error) {
      console.error(`❌ Error fetching materials for category ${categoryKey}:`, error);
      return { data: null, error: error.message };
    }

    console.log(`✅ Fetched ${data?.length || 0} materials for category: ${categoryKey}`);
    return { data: data as ServiceMaterial[], error: null };
  } catch (err: any) {
    console.error(`❌ Exception fetching materials for category ${categoryKey}:`, err);
    return { data: null, error: err.message || 'Unknown error occurred' };
  }
}

/**
 * Fetch all materials for a service, grouped by category
 *
 * @param companyId - Company UUID
 * @param serviceConfigId - Service config UUID
 * @returns Object mapping category keys to arrays of materials
 */
export async function fetchAllMaterialsForService(
  companyId: string,
  serviceConfigId: string
): Promise<{ data: MaterialsByCategory | null; error: string | null }> {
  try {
    const supabase = getSupabase();

    // Fetch all materials for the service
    const { data, error } = await supabase
      .from('service_materials')
      .select('*')
      .eq('company_id', companyId)
      .eq('service_config_id', serviceConfigId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('material_name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching all materials:', error);
      return { data: null, error: error.message };
    }

    // Group by category
    const materialsByCategory: MaterialsByCategory = {};
    (data as ServiceMaterial[]).forEach((material) => {
      if (!materialsByCategory[material.material_category]) {
        materialsByCategory[material.material_category] = [];
      }
      materialsByCategory[material.material_category].push(material);
    });

    console.log(`✅ Fetched materials for ${Object.keys(materialsByCategory).length} categories`);
    return { data: materialsByCategory, error: null };
  } catch (err: any) {
    console.error('❌ Exception fetching all materials:', err);
    return { data: null, error: err.message || 'Unknown error occurred' };
  }
}

/**
 * Get the default material for a category
 *
 * @param companyId - Company UUID
 * @param serviceConfigId - Service config UUID
 * @param categoryKey - Category key
 * @returns Default material or null if none exists
 */
export async function getDefaultMaterial(
  companyId: string,
  serviceConfigId: string,
  categoryKey: string
): Promise<{ data: ServiceMaterial | null; error: string | null }> {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('service_materials')
      .select('*')
      .eq('company_id', companyId)
      .eq('service_config_id', serviceConfigId)
      .eq('material_category', categoryKey)
      .eq('is_default', true)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error) {
      // Not finding a default is not necessarily an error
      if (error.code === 'PGRST116') {
        console.warn(`⚠️ No default material found for category: ${categoryKey}`);
        return { data: null, error: null };
      }
      console.error(`❌ Error fetching default material for ${categoryKey}:`, error);
      return { data: null, error: error.message };
    }

    return { data: data as ServiceMaterial, error: null };
  } catch (err: any) {
    console.error(`❌ Exception fetching default material for ${categoryKey}:`, err);
    return { data: null, error: err.message || 'Unknown error occurred' };
  }
}

/**
 * Get material count for a category
 *
 * @param companyId - Company UUID
 * @param serviceConfigId - Service config UUID
 * @param categoryKey - Category key
 * @returns Count of active materials in category
 */
export async function getMaterialCount(
  companyId: string,
  serviceConfigId: string,
  categoryKey: string
): Promise<{ count: number; error: string | null }> {
  try {
    const supabase = getSupabase();

    const { count, error } = await supabase
      .from('service_materials')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('service_config_id', serviceConfigId)
      .eq('material_category', categoryKey)
      .eq('is_active', true);

    if (error) {
      console.error(`❌ Error counting materials for ${categoryKey}:`, error);
      return { count: 0, error: error.message };
    }

    return { count: count || 0, error: null };
  } catch (err: any) {
    console.error(`❌ Exception counting materials for ${categoryKey}:`, err);
    return { count: 0, error: err.message || 'Unknown error occurred' };
  }
}

/**
 * Fetch material by ID
 *
 * @param materialId - Material UUID
 * @returns Material record or null
 */
export async function fetchMaterialById(
  materialId: string
): Promise<{ data: ServiceMaterial | null; error: string | null }> {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('service_materials')
      .select('*')
      .eq('id', materialId)
      .single();

    if (error) {
      console.error(`❌ Error fetching material ${materialId}:`, error);
      return { data: null, error: error.message };
    }

    return { data: data as ServiceMaterial, error: null };
  } catch (err: any) {
    console.error(`❌ Exception fetching material ${materialId}:`, err);
    return { data: null, error: err.message || 'Unknown error occurred' };
  }
}

/**
 * Fetch service configs for materials tab service selector
 *
 * Returns all services that have material categories configured
 * Uses a single optimized query with JOIN to avoid N+1 problem
 *
 * @param companyId - Company UUID
 * @returns Array of service configs with material categories
 */
export async function fetchServicesWithMaterials(
  companyId: string
): Promise<{ data: Array<{ id: string; service_name: string }> | null; error: string | null }> {
  try {
    const supabase = getSupabase();

    // Optimized query: Get all categories in one query, then filter services
    const { data: categories, error: categoriesError } = await supabase
      .from('service_material_categories')
      .select('service_config_id')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (categoriesError) {
      console.error('❌ Error fetching material categories:', categoriesError);
      return { data: null, error: categoriesError.message };
    }

    // Get unique service_config_ids that have categories
    const serviceIdsWithMaterials = [...new Set(categories?.map(c => c.service_config_id) || [])];

    if (serviceIdsWithMaterials.length === 0) {
      console.log('⚠️ No services with materials configured');
      return { data: [], error: null };
    }

    // Fetch service details for those IDs
    const { data: serviceConfigs, error: serviceError } = await supabase
      .from('service_pricing_configs')
      .select('id, service_name')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .in('id', serviceIdsWithMaterials);

    if (serviceError) {
      console.error('❌ Error fetching service configs:', serviceError);
      return { data: null, error: serviceError.message };
    }

    console.log(`✅ Found ${serviceConfigs?.length || 0} services with materials configured`);
    return { data: serviceConfigs || [], error: null };
  } catch (err: any) {
    console.error('❌ Exception fetching services with materials:', err);
    return { data: null, error: err.message || 'Unknown error occurred' };
  }
}

/**
 * Update material waste or compaction factor
 *
 * @param materialId - Material UUID
 * @param field - Field to update ('waste_factor_percentage' or 'compaction_factor_percentage')
 * @param value - New percentage value (e.g., 10.0 for 10%)
 * @returns Success status
 */
export async function updateMaterialFactor(
  materialId: string,
  field: 'waste_factor_percentage' | 'compaction_factor_percentage',
  value: number
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('service_materials')
      .update({ [field]: value })
      .eq('id', materialId);

    if (error) {
      console.error(`❌ Error updating ${field} for material ${materialId}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Updated ${field} to ${value}% for material ${materialId}`);
    return { success: true, error: null };
  } catch (err: any) {
    console.error(`❌ Exception updating ${field}:`, err);
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
}
