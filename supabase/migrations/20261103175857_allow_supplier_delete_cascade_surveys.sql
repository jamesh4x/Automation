/*
# Allow supplier deletion with dependent surveys

1. Modified relationship
- `surveys.supplier_id` now deletes dependent surveys when the referenced supplier is deleted.
- Existing survey child records continue to follow their existing ON DELETE CASCADE relationships.

2. User-visible behavior
- The Supplier Database delete action is no longer blocked for suppliers that have surveys.
- Deleting a supplier also deletes its surveys, team members, uploaded-file records, AI runs, and storage objects are not automatically removed by this database relationship.

3. Security
- No RLS, grant, or role changes.

4. Important note
- This is an explicitly requested destructive action. The application asks for confirmation before deleting.
*/

ALTER TABLE surveys DROP CONSTRAINT IF EXISTS surveys_supplier_id_fkey;
ALTER TABLE surveys
  ADD CONSTRAINT surveys_supplier_id_fkey
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE;
