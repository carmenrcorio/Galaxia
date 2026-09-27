/**
 * Re-export. Canonical copy and helpers live in `@galaxia/core` so web and
 * mobile cannot drift (D5: one account graph, one confirmation word).
 */
export {
  ACCOUNT_DELETE_COPY,
  ACCOUNT_DELETE_MODAL_COPY,
  ACCOUNT_EXPORT_COPY,
  ACCOUNT_EXPORT_RATE_LIMIT,
  ACCOUNT_SECTION_COPY,
  DELETE_CONFIRMATION_DISPLAY_WORD,
  DELETE_CONFIRMATION_WORD,
  EXPORT_PROFILE_FIELDS,
  accountExportFilename,
  buildAccountExport,
  isDeleteConfirmation,
  shouldWarnBillingOnDelete,
  type AccountExportInput,
  type AccountExportPayload,
  type ExportChartRow,
  type ExportGroupMemberRow,
  type ExportGroupRow,
  type ExportMilestoneRow,
  type ExportNoteRow,
  type ExportPersonRow,
  type ExportProfileField,
  type ExportProfileRow,
  type ExportRelationshipRow
} from "@galaxia/core";
