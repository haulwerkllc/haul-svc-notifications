/**
 * Company Role Lookup Helper
 * 
 * Shared utility for resolving users from companies based on their assigned roles.
 * Used by notification resolvers to identify recipients for company-targeted notifications.
 * 
 * CRITICAL DATA MODEL CONTEXT:
 * - Each CompanyRole item represents a user's membership in a company
 * - The `roles` field contains ALL assigned roles for that user in that company
 * - The `roles` field may be returned as: Set (DynamoDB SS), Array (DynamoDB L), or single string
 * - Always normalize `roles` before checking membership
 * 
 * @see ARCHITECTURE.md for full CompanyRole table structure documentation
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const COMPANY_ROLE_TABLE = process.env.COMPANY_ROLE_TABLE_NAME;

/**
 * Normalize roles field from DynamoDB to a consistent array format
 * Handles Set (SS type), Array (L type), or single string value
 * 
 * @param {Set|Array|string|undefined} roles - Raw roles value from DynamoDB
 * @returns {string[]} - Normalized array of role strings
 */
function normalizeRoles(roles) {
  if (roles instanceof Set) {
    return Array.from(roles);
  }
  if (Array.isArray(roles)) {
    return roles;
  }
  if (roles) {
    return [roles];
  }
  return [];
}

/**
 * Resolve users from companies who have at least one of the specified eligible roles.
 * 
 * @param {Object} options - Configuration options
 * @param {string[]} options.companyIds - Array of company IDs to query (also accepts single string)
 * @param {string[]} options.eligibleRoles - Array of role strings to filter by (e.g., ['OWNER', 'ADMIN', 'DISPATCHER'])
 * @param {boolean} [options.includeMetadata=false] - Whether to include company/role metadata in results
 * @param {string} [options.logPrefix='CompanyRoleLookup'] - Prefix for log messages
 * @returns {Promise<Array<{user_id: string, metadata?: Object}>>} - Deduplicated array of recipients
 * 
 * @example
 * // Simple usage - returns [{ user_id: 'xxx' }, ...]
 * const recipients = await resolveUsersByCompanyRole({
 *   companyIds: ['company-1', 'company-2'],
 *   eligibleRoles: ['OWNER', 'ADMIN', 'DISPATCHER']
 * });
 * 
 * @example
 * // With metadata - returns [{ user_id: 'xxx', metadata: { company_id, roles, primary_role } }, ...]
 * const recipients = await resolveUsersByCompanyRole({
 *   companyIds: 'single-company-id',
 *   eligibleRoles: ['OWNER', 'ADMIN'],
 *   includeMetadata: true
 * });
 */
async function resolveUsersByCompanyRole(options) {
  const {
    companyIds: rawCompanyIds,
    eligibleRoles,
    includeMetadata = false,
    logPrefix = 'CompanyRoleLookup'
  } = options;

  // Normalize companyIds to array (accept single string or array)
  const companyIds = Array.isArray(rawCompanyIds) ? rawCompanyIds : [rawCompanyIds];

  // Validate inputs
  if (!companyIds || companyIds.length === 0) {
    console.warn(`[${logPrefix}] No company IDs provided`);
    return [];
  }

  if (!eligibleRoles || eligibleRoles.length === 0) {
    console.warn(`[${logPrefix}] No eligible roles provided`);
    return [];
  }

  console.log(`[${logPrefix}] Resolving users by company role`, {
    company_count: companyIds.length,
    eligible_roles: eligibleRoles
  });

  const recipients = [];
  const seenUserIds = new Set();

  for (const companyId of companyIds) {
    if (!companyId) continue;

    try {
      console.log(`[${logPrefix}] Querying CompanyRole table`, {
        table: COMPANY_ROLE_TABLE,
        index: 'companyId-index',
        company_id: companyId
      });

      const result = await docClient.send(new QueryCommand({
        TableName: COMPANY_ROLE_TABLE,
        IndexName: 'companyId-index',
        KeyConditionExpression: 'company_id = :companyId',
        ExpressionAttributeValues: {
          ':companyId': companyId
        }
      }));

      const companyRoleRecords = result.Items || [];

      console.log(`[${logPrefix}] Found company role records`, {
        company_id: companyId,
        total_records: companyRoleRecords.length
      });

      // Filter for eligible users (status ACTIVE and has at least one eligible role)
      for (const record of companyRoleRecords) {
        // Skip inactive users
        if (record.status !== 'ACTIVE') continue;

        // Skip if no user_id
        if (!record.user_id) continue;

        // Skip already seen users (dedup across companies)
        if (seenUserIds.has(record.user_id)) continue;

        // Normalize roles to array
        const userRoles = normalizeRoles(record.roles);

        // Check if user has at least one eligible role
        const hasEligibleRole = userRoles.some(role => eligibleRoles.includes(role));

        if (!hasEligibleRole) continue;

        // Add to seen set
        seenUserIds.add(record.user_id);

        // Build recipient object
        if (includeMetadata) {
          const primaryRole = userRoles.find(r => eligibleRoles.includes(r)) || userRoles[0];
          recipients.push({
            user_id: record.user_id,
            metadata: {
              company_id: companyId,
              roles: userRoles,
              primary_role: primaryRole
            }
          });
        } else {
          recipients.push({ user_id: record.user_id });
        }
      }

      console.log(`[${logPrefix}] Eligible users for company`, {
        company_id: companyId,
        eligible_count: recipients.filter(r => 
          !includeMetadata || r.metadata?.company_id === companyId
        ).length
      });

    } catch (error) {
      console.error(`[${logPrefix}] Error querying company roles`, {
        company_id: companyId,
        error: error.message
      });
      // Continue with other companies - don't fail entire operation
    }
  }

  console.log(`[${logPrefix}] Total recipients resolved`, {
    total: recipients.length
  });

  return recipients;
}

module.exports = {
  resolveUsersByCompanyRole,
  normalizeRoles
};
