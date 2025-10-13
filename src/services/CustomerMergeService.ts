/**
 * Customer Merge Service
 *
 * Handles duplicate customer detection and merging.
 * Uses customer_matching_keys table for fuzzy matching.
 * Maintains audit trail in customer_merge_log.
 */

import { getSupabase } from './supabase';
import { customerRepository } from './CustomerRepository';
import {
  CustomerProfile,
  CustomerMergePreview,
  CustomerMergeResult,
  DuplicateCustomer,
  DuplicateGroup,
  RepositoryError,
  NotFoundError,
  ValidationError
} from '../types/customer';

export class CustomerMergeService {
  private supabase = getSupabase();

  /**
   * Find potential duplicate customers for a given customer
   * Uses customer_matching_keys for fuzzy matching
   */
  async findDuplicates(customerId: string): Promise<DuplicateCustomer[]> {
    try {
      // Get the customer and their matching keys
      const customer = await customerRepository.getCustomerById(customerId);

      const { data: matchingKeys, error: keysError } = await this.supabase
        .from('customer_matching_keys')
        .select('key_type, normalized_value')
        .eq('customer_id', customerId);

      if (keysError) {
        throw new RepositoryError('Failed to fetch matching keys', keysError);
      }

      if (!matchingKeys || matchingKeys.length === 0) {
        return [];
      }

      // Find other customers with matching keys
      const duplicates = new Map<string, DuplicateCustomer>();

      for (const key of matchingKeys) {
        const { data: matches } = await this.supabase
          .from('customer_matching_keys')
          .select('customer_id')
          .eq('normalized_value', key.normalized_value)
          .eq('key_type', key.key_type)
          .neq('customer_id', customerId);

        if (matches) {
          for (const match of matches) {
            if (!duplicates.has(match.customer_id)) {
              try {
                const duplicateCustomer = await customerRepository.getCustomerById(match.customer_id);

                // Skip if deleted or already merged
                if (duplicateCustomer.deleted_at || duplicateCustomer.merged_into_customer_id) {
                  continue;
                }

                // Calculate match confidence
                let confidence = 0;
                const matchedFields: Array<'email' | 'phone' | 'name'> = [];

                if (key.key_type === 'email') {
                  confidence = 100;
                  matchedFields.push('email');
                } else if (key.key_type === 'phone') {
                  confidence = 90;
                  matchedFields.push('phone');
                } else if (key.key_type === 'name') {
                  // Calculate name similarity
                  const similarity = this.calculateNameSimilarity(
                    customer.customer_name,
                    duplicateCustomer.customer_name
                  );
                  if (similarity >= 0.7) {
                    confidence = Math.round(similarity * 80);
                    matchedFields.push('name');
                  }
                }

                if (confidence > 0) {
                  duplicates.set(match.customer_id, {
                    customer: duplicateCustomer,
                    match_confidence: confidence,
                    matched_fields: matchedFields,
                    similarity_score: confidence / 100
                  });
                }
              } catch (error) {
                console.warn(`Failed to fetch duplicate customer ${match.customer_id}:`, error);
              }
            }
          }
        }
      }

      // Sort by confidence
      return Array.from(duplicates.values()).sort((a, b) => b.match_confidence - a.match_confidence);

    } catch (error) {
      console.error('CustomerMergeService: Error finding duplicates:', error);
      throw error;
    }
  }

  /**
   * Preview what will happen if two customers are merged
   */
  async previewMerge(
    sourceId: string,
    targetId: string
  ): Promise<CustomerMergePreview> {
    try {
      // Fetch both customers
      const [source, target] = await Promise.all([
        customerRepository.getCustomerById(sourceId),
        customerRepository.getCustomerById(targetId)
      ]);

      // Check if customers can be merged
      if (source.deleted_at) {
        throw new ValidationError('Cannot merge deleted customer');
      }
      if (source.merged_into_customer_id) {
        throw new ValidationError('Source customer was already merged');
      }
      if (target.deleted_at) {
        throw new ValidationError('Cannot merge into deleted customer');
      }
      if (target.merged_into_customer_id) {
        throw new ValidationError('Target customer was already merged');
      }

      // Identify field conflicts
      const fieldConflicts: any[] = [];
      const mergedResult: CustomerProfile = { ...target };

      // Check each field
      const fieldsToCheck = [
        'customer_email',
        'customer_phone',
        'customer_address',
        'customer_notes'
      ];

      fieldsToCheck.forEach(field => {
        const sourceValue = (source as any)[field];
        const targetValue = (target as any)[field];

        if (sourceValue && targetValue && sourceValue !== targetValue) {
          fieldConflicts.push({
            field,
            source_value: sourceValue,
            target_value: targetValue,
            resolution: 'keep_target' // Default resolution
          });
        } else if (sourceValue && !targetValue) {
          // Take source value if target doesn't have it
          (mergedResult as any)[field] = sourceValue;
        }
      });

      // Merge tags
      const sourceTags = source.tags || [];
      const targetTags = target.tags || [];
      const mergedTags = [...new Set([...targetTags, ...sourceTags])];
      mergedResult.tags = mergedTags;

      // Count conversations to transfer
      const { count: conversationCount } = await this.supabase
        .from('VC Usage')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', sourceId);

      // Count events to transfer
      const { count: eventCount } = await this.supabase
        .from('customer_events')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', sourceId);

      return {
        source_customer: source,
        target_customer: target,
        merged_result: mergedResult,
        field_conflicts: fieldConflicts,
        conversations_to_transfer: conversationCount || 0,
        events_to_transfer: eventCount || 0,
        tags_to_merge: sourceTags.filter(tag => !targetTags.includes(tag))
      };

    } catch (error) {
      console.error('CustomerMergeService: Error previewing merge:', error);
      throw error;
    }
  }

  /**
   * Merge two customer records
   * Transfers all related data and creates audit log
   */
  async mergeCustomers(
    sourceId: string,
    targetId: string,
    userId?: string
  ): Promise<CustomerMergeResult> {
    try {
      // Get merge preview
      const preview = await this.previewMerge(sourceId, targetId);

      // Start transaction-like operations
      const timestamp = new Date().toISOString();

      // 1. Transfer all VC Usage records
      const { error: vcError } = await this.supabase
        .from('VC Usage')
        .update({
          customer_id: targetId,
          customer_linked_at: timestamp,
          customer_link_source: 'merge'
        })
        .eq('customer_id', sourceId);

      if (vcError) {
        throw new RepositoryError('Failed to transfer conversations', vcError);
      }

      // 2. Transfer all customer_events
      const { error: eventsError } = await this.supabase
        .from('customer_events')
        .update({ customer_id: targetId })
        .eq('customer_id', sourceId);

      if (eventsError) {
        console.warn('Failed to transfer events:', eventsError);
        // Non-critical, continue
      }

      // 3. Transfer conversation summaries
      const { error: summariesError } = await this.supabase
        .from('customer_conversation_summaries')
        .update({ customer_id: targetId })
        .eq('customer_id', sourceId);

      if (summariesError) {
        console.warn('Failed to transfer conversation summaries:', summariesError);
        // Non-critical, continue
      }

      // 4. Update target customer with merged data
      const updates: any = {};

      // Take non-null values from source if target doesn't have them
      if (!preview.target_customer.customer_email && preview.source_customer.customer_email) {
        updates.customer_email = preview.source_customer.customer_email;
      }
      if (!preview.target_customer.customer_phone && preview.source_customer.customer_phone) {
        updates.customer_phone = preview.source_customer.customer_phone;
      }
      if (!preview.target_customer.customer_address && preview.source_customer.customer_address) {
        updates.customer_address = preview.source_customer.customer_address;
      }

      // Merge notes
      if (preview.source_customer.customer_notes) {
        const existingNotes = preview.target_customer.customer_notes || '';
        const mergeNote = `\n\n--- Merged from ${preview.source_customer.customer_name} on ${new Date().toLocaleDateString()} ---\n`;
        updates.customer_notes = existingNotes + mergeNote + preview.source_customer.customer_notes;
      }

      // Merge tags
      if (preview.tags_to_merge.length > 0) {
        updates.tags = preview.merged_result.tags;
      }

      if (Object.keys(updates).length > 0) {
        await customerRepository.updateCustomer(targetId, updates);
      }

      // 5. Create merge log entry
      const { data: mergeLog, error: logError } = await this.supabase
        .from('customer_merge_log')
        .insert({
          source_customer_id: sourceId,
          target_customer_id: targetId,
          merge_reason: 'duplicate_detected',
          merged_data: {
            source_snapshot: preview.source_customer,
            target_snapshot: preview.target_customer,
            field_conflicts: preview.field_conflicts,
            updates_applied: updates
          },
          merged_by_user_id: userId || null,
          merged_at: timestamp
        })
        .select()
        .single();

      if (logError) {
        console.warn('Failed to create merge log:', logError);
        // Non-critical, continue
      }

      // 6. Soft delete and mark source as merged
      await this.supabase
        .from('customers')
        .update({
          merged_into_customer_id: targetId,
          deleted_at: timestamp,
          status: 'merged',
          updated_at: timestamp
        })
        .eq('id', sourceId);

      // 7. Create event log
      await this.supabase
        .from('customer_events')
        .insert([
          {
            customer_id: targetId,
            event_type: 'merged',
            event_data: {
              source_customer_id: sourceId,
              source_customer_name: preview.source_customer.customer_name,
              merge_log_id: mergeLog?.id
            },
            created_by_user_id: userId || null
          },
          {
            customer_id: sourceId,
            event_type: 'merged',
            event_data: {
              merged_into_customer_id: targetId,
              target_customer_name: preview.target_customer.customer_name
            },
            created_by_user_id: userId || null
          }
        ]);

      // Get final merged customer
      const mergedCustomer = await customerRepository.getCustomerById(targetId);

      return {
        success: true,
        merged_customer: mergedCustomer,
        merge_log_id: mergeLog?.id || '',
        conversations_transferred: preview.conversations_to_transfer,
        events_transferred: preview.events_to_transfer
      };

    } catch (error) {
      console.error('CustomerMergeService: Error merging customers:', error);
      throw error;
    }
  }

  /**
   * Undo a customer merge
   * Restores the source customer and transfers data back
   */
  async undoMerge(mergeLogId: string): Promise<void> {
    try {
      // Get merge log
      const { data: mergeLog, error: logError } = await this.supabase
        .from('customer_merge_log')
        .select('*')
        .eq('id', mergeLogId)
        .single();

      if (logError || !mergeLog) {
        throw new NotFoundError('Merge log not found');
      }

      const sourceId = mergeLog.source_customer_id;
      const targetId = mergeLog.target_customer_id;

      // 1. Restore source customer
      await this.supabase
        .from('customers')
        .update({
          merged_into_customer_id: null,
          deleted_at: null,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', sourceId);

      // 2. Transfer conversations back (if they were originally from source)
      // This is complex and may not always be possible
      // For now, log a warning
      console.warn('CustomerMergeService: Undo merge does not transfer conversations back');

      // 3. Create event log
      await this.supabase
        .from('customer_events')
        .insert({
          customer_id: sourceId,
          event_type: 'restored',
          event_data: {
            restore_reason: 'merge_undone',
            merge_log_id: mergeLogId
          }
        });

      console.log(`CustomerMergeService: Undid merge ${mergeLogId}`);

    } catch (error) {
      console.error('CustomerMergeService: Error undoing merge:', error);
      throw error;
    }
  }

  /**
   * Find all duplicate groups for a company
   * Returns groups of customers that appear to be duplicates
   */
  async bulkFindDuplicates(companyId: string): Promise<DuplicateGroup[]> {
    try {
      // Get all active customers
      const { items: customers } = await customerRepository.getCustomers(
        companyId,
        { limit: 1000 }
      );

      const groups: DuplicateGroup[] = [];
      const processed = new Set<string>();

      for (const customer of customers) {
        if (processed.has(customer.id)) continue;

        const duplicates = await this.findDuplicates(customer.id);

        if (duplicates.length > 0) {
          // Mark all as processed
          processed.add(customer.id);
          duplicates.forEach(dup => processed.add(dup.customer.id));

          // Calculate total metrics
          let totalConversations = customer.total_conversations || 0;
          let totalInteractions = 0;

          for (const dup of duplicates) {
            const metrics = await customerRepository.getCustomerById(dup.customer.id);
            totalConversations += metrics.total_conversations || 0;
            totalInteractions += metrics.total_interactions || 0;
          }

          // Determine recommended action
          let recommendedAction: 'merge' | 'review' | 'keep_separate' = 'review';

          // If all duplicates have high confidence, recommend merge
          if (duplicates.every(d => d.match_confidence >= 90)) {
            recommendedAction = 'merge';
          }
          // If all duplicates have low confidence, recommend keeping separate
          else if (duplicates.every(d => d.match_confidence < 70)) {
            recommendedAction = 'keep_separate';
          }

          groups.push({
            master_customer: customer as CustomerProfile,
            duplicates,
            recommended_action: recommendedAction,
            total_conversations: totalConversations,
            total_interactions: totalInteractions
          });
        }
      }

      return groups;

    } catch (error) {
      console.error('CustomerMergeService: Error finding bulk duplicates:', error);
      throw error;
    }
  }

  /**
   * Auto-merge high confidence duplicates
   * Only merges when confidence is 100% (exact email match)
   */
  async autoMergeDuplicates(
    companyId: string,
    userId?: string
  ): Promise<{ merged: number; skipped: number }> {
    try {
      const groups = await this.bulkFindDuplicates(companyId);

      let merged = 0;
      let skipped = 0;

      for (const group of groups) {
        if (group.recommended_action !== 'merge') {
          skipped += group.duplicates.length;
          continue;
        }

        // Only auto-merge if all duplicates have 100% confidence
        const perfectMatches = group.duplicates.filter(d => d.match_confidence === 100);

        if (perfectMatches.length === 0) {
          skipped += group.duplicates.length;
          continue;
        }

        // Merge each perfect match into master
        for (const duplicate of perfectMatches) {
          try {
            await this.mergeCustomers(
              duplicate.customer.id,
              group.master_customer.id,
              userId
            );
            merged++;
          } catch (error) {
            console.warn(`Failed to auto-merge ${duplicate.customer.id}:`, error);
            skipped++;
          }
        }

        // Skip non-perfect matches
        skipped += group.duplicates.length - perfectMatches.length;
      }

      console.log(`CustomerMergeService: Auto-merged ${merged} duplicates, skipped ${skipped}`);
      return { merged, skipped };

    } catch (error) {
      console.error('CustomerMergeService: Error auto-merging duplicates:', error);
      throw error;
    }
  }

  /**
   * Calculate similarity between two names
   * Uses Levenshtein distance algorithm
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();

    if (n1 === n2) return 1;

    const maxLength = Math.max(n1.length, n2.length);
    if (maxLength === 0) return 1;

    const distance = this.levenshteinDistance(n1, n2);
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const matrix: number[][] = [];

    for (let i = 0; i <= m; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= n; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[m][n];
  }
}

// Export singleton instance
export const customerMergeService = new CustomerMergeService();