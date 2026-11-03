/*
# Allow deleting any supplier

1. Modified access policy
- The supplier DELETE policy no longer checks whether surveys exist.
- The database foreign key already cascades deletion from a supplier to its surveys.

2. User-visible behavior
- A confirmed delete removes the supplier and all related survey records.

3. Security
- This is a single-tenant app with shared anon/authenticated access, so the existing roles remain unchanged.
- No new grants or tables are added.

4. Important note
- This intentionally removes related supplier data after the application confirmation dialog, as explicitly requested.
*/

DROP POLICY IF EXISTS "anon_delete_suppliers_without_surveys" ON suppliers;
CREATE POLICY "anon_delete_suppliers" ON suppliers FOR DELETE
  TO anon, authenticated USING (true);
