'use server';

import { supabase } from '../supabaseClient';
import { Lead, TimelineActivity } from '../types';

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Type-safe Next.js Server Action to update a lead field
 */
export async function updateLeadFieldAction(
  leadId: string,
  updates: Partial<Lead>
): Promise<ActionResponse<Lead>> {
  try {
    if (!leadId) {
      return { success: false, error: 'Lead ID is required.' };
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Lead };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown execution error.';
    return { success: false, error: msg };
  }
}

/**
 * Type-safe Next.js Server Action to create a timeline activity for a lead
 */
export async function logLeadActivityAction(
  activity: Omit<TimelineActivity, 'id' | 'created_at' | 'updated_at'>
): Promise<ActionResponse<TimelineActivity>> {
  try {
    const { data, error } = await supabase
      .from('activities')
      .insert([activity])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as TimelineActivity };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown execution error.';
    return { success: false, error: msg };
  }
}

/**
 * Type-safe Server Action to delete a CRM lead and resolve cascading rules
 */
export async function deleteLeadAction(leadId: string): Promise<ActionResponse<boolean>> {
  try {
    if (!leadId) {
      return { success: false, error: 'Lead ID is required.' };
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown execution error.';
    return { success: false, error: msg };
  }
}
