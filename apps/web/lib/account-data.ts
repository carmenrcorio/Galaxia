/**
 * Re-export. Canonical copy and helpers live in `@galaxia/core` so web and
 * mobile cannot drift (D5: one account graph, one confirmation word).
 */
export {
  ACCOUNT_DELETE_COPY,
  ACCOUNT_EXPORT_COPY,
  DELETE_CONFIRMATION_WORD,
  EXPORT_PROFILE_FIELDS,
  isDeleteConfirmation,
  shouldWarnBillingOnDelete,
  type AccountExportPayload,
  type ExportProfileField
} from "@galaxia/core";
