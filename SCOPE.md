# SCOPE

This document defines the database schema and the data anomaly handling policies for the Shared Expenses App.

## 1. Database Schema

We use a relational database to support robust foreign keys and precise transaction tracking.

- **User**
  - `id` (UUID, PK)
  - `name` (String, unique)
  - `email` (String, optional)
  - `created_at` (DateTime)

- **Group**
  - `id` (UUID, PK)
  - `name` (String)
  - `default_currency` (String)
  - `created_at` (DateTime)

- **GroupMember**
  - `id` (UUID, PK)
  - `group_id` (UUID, FK)
  - `user_id` (UUID, FK)
  - `joined_at` (Date)
  - `left_at` (Date, nullable)
  - *Provides dynamic membership so Sam joining or Meera leaving is accurately tracked over time.*

- **Expense**
  - `id` (UUID, PK)
  - `group_id` (UUID, FK)
  - `paid_by_user_id` (UUID, FK, nullable for unassigned)
  - `description` (String)
  - `amount` (Decimal)
  - `currency` (String)
  - `date` (Date)
  - `notes` (String)
  - `original_csv_row_id` (Integer)
  - `created_at` (DateTime)

- **ExpenseSplit**
  - `id` (UUID, PK)
  - `expense_id` (UUID, FK)
  - `user_id` (UUID, FK)
  - `amount_owed` (Decimal)
  - `split_type` (Enum: EQUAL, EXACT, PERCENTAGE, SHARE)
  - `split_value` (Decimal, nullable - stores the exact % or share value if applicable)

- **Settlement**
  - `id` (UUID, PK)
  - `group_id` (UUID, FK)
  - `paid_by_user_id` (UUID, FK)
  - `paid_to_user_id` (UUID, FK)
  - `amount` (Decimal)
  - `currency` (String)
  - `date` (Date)

- **ImportJob**
  - `id` (UUID, PK)
  - `group_id` (UUID, FK)
  - `status` (Enum: PENDING, COMPLETED, FAILED)
  - `created_at` (DateTime)

- **ImportAnomaly**
  - `id` (UUID, PK)
  - `import_job_id` (UUID, FK)
  - `row_index` (Integer)
  - `row_data` (JSON)
  - `issue_type` (String)
  - `issue_description` (String)
  - `proposed_action` (String)
  - `resolution_status` (Enum: PENDING, APPROVED, REJECTED)
  - *Stores every anomaly detected during the CSV import, satisfying Meera's requirement to approve anything the app changes or deletes.*

---

## 2. Anomaly Log & Resolution Policy

The provided `expenses_export.csv` contains multiple deliberate data issues. Below is our policy for detecting and resolving each anomaly. **All resolutions will be flagged in the UI for user approval before modifying the database.**

| Anomaly | Detection Mechanism | Resolution Policy |
|---------|---------------------|-------------------|
| **1. Exact Duplicate** (08-02 Marina Bites) | Hash of date, lowercased description, amount, and payer matches another row. | Propose keeping the first occurrence and deleting the duplicate. |
| **2. Name Inconsistencies** ('priya', 'Priya S', 'rohan') | Case-insensitive and fuzzy matching against the `User` table. | Propose normalization to the canonical user names ("Priya", "Rohan"). |
| **3. Too Many Decimals** (899.995) | Amount regex matches >2 decimal places. | Propose rounding to nearest 2 decimals (900.00). |
| **4. Missing Payer** (22-02 House cleaning) | `paid_by` column is empty. | Propose assigning to a default user (e.g., the user importing) or prompt for manual selection. |
| **5. Settlement as Expense** (25-02 Rohan paid Aisha) | `split_with` has 1 person, missing/empty `split_type`, notes indicate settlement. | Propose converting to a `Settlement` record from Rohan to Aisha instead of an `Expense`. |
| **6. Percentages > 100%** (28-02 Pizza Friday) | Sum of percentages in `split_details` > 100%. | Propose normalizing percentages proportionally so they sum to 100% (e.g., 30/110, etc.). |
| **7. Unrecognized User** (11-03 Parasailing 'Kabir') | `split_with` contains a name not in the `User` table. | Propose allocating the unrecognized user's share back to the person who paid the expense (Dev). |
| **8. Conflicting Duplicates** (11-03 Thalassa) | Same date, similar description, but different amounts/payers. | Present both rows as conflicting. Propose keeping the one with the higher amount, but require user to pick which one to keep and delete the other. |
| **9. Negative Amount / Refund** (12-03 Parasailing refund) | Amount is < 0. | Propose treating as a refund (negative expense) which reduces everyone's debt to the payer. |
| **10. Invalid Date Format** (Mar-14) | Fails standard date parsing (DD-MM-YYYY). | Propose parsing via fallback formats and standardizing to 14-03-2026. |
| **11. Missing Currency** (15-03 Groceries) | `currency` column is empty. | Propose defaulting to the group's base currency (INR). |
| **12. Zero Amount** (22-03 Swiggy) | Amount is 0. | Propose ignoring/deleting the row entirely. |
| **13. Out-of-Order / Ambiguous Date** (04-05-2026 Deep cleaning) | Appears chronologically between late March and early April rows. | Propose interpreting as DD-MM (05-04-2026) instead of MM-DD based on adjacent row dates. |
| **14. Inactive Member Split** (02-04 BigBasket Meera) | Split includes a member (`Meera`) whose `left_at` date is prior to the expense `date`. | Propose removing the inactive member from the split and redistributing the cost among the remaining active members. |
| **15. Split Type Mismatch** (18-04 Furniture) | `split_type` is `equal` but `split_details` defines `shares`. | Propose prioritizing the explicit `split_details` over the generic `split_type` label. |
