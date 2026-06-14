# Decision Log

This log captures the significant architectural and product decisions made during the development of the Shared Expenses App.

## 1. Database and ORM
**Options Considered**: 
- Raw SQL with PostgreSQL
- Prisma ORM with SQLite (for dev) and PostgreSQL (for prod)
- Drizzle ORM

**Decision**: Prisma ORM with SQLite for local development.
**Why**: Prisma provides a highly readable `schema.prisma` file which clearly maps the relationships (e.g. `Expense`, `ExpenseSplit`, `ImportAnomaly`). SQLite ensures the app is highly portable and easy to run locally without external dependencies. This easily scales to PostgreSQL for production deployment.

## 2. Anomaly Resolution Policy (Meera's Requirement)
**Options Considered**: 
- Automatically guess and fix data during import.
- Reject the entire CSV if any anomaly is found.
- Parse valid rows immediately, and quarantine invalid rows.

**Decision**: The "Staging & Approval" Pipeline.
**Why**: Meera explicitly requested to approve anything the app deletes or changes. The importer parses the CSV and creates `ImportJob` and `ImportAnomaly` records. Every row is staged. Anomalous rows are flagged with proposed resolutions, and even "Valid" rows are staged for final review. The user must explicitly approve/edit/reject the rows before they are committed to the actual `Expense` tables.

## 3. Handling Dynamic Group Membership (Sam & Meera's Requirement)
**Options Considered**: 
- A static list of members per group.
- `joinedAt` and `leftAt` timestamps in the `GroupMember` mapping table.

**Decision**: Temporal Membership via `joinedAt` and `leftAt`.
**Why**: Sam joined mid-April and Meera left at the end of March. By tracking when they joined/left, the anomaly detection engine can flag if an expense splits costs with someone who wasn't an active member at the time (e.g., Anomaly 14: Meera included in April groceries).

## 4. Exact vs Generic Split Types
**Options Considered**: 
- Rely entirely on the `split_type` string.
- Override `split_type` if `split_details` has conflicting data.

**Decision**: Prioritize `split_details`.
**Why**: In the CSV, there's a row (18-04 Furniture) where `split_type` is `equal` but the details clearly define `shares`. We chose to flag this as an anomaly but propose prioritizing the specific split details over the generic string label.

## 5. Settlement Representation
**Options Considered**: 
- Treat settlements as negative expenses.
- Create a dedicated `Settlement` table.

**Decision**: Dedicated `Settlement` table.
**Why**: A settlement (like "Rohan paid Aisha back") doesn't represent an external cost incurred by the group, but rather money moving internally. Separating it into its own table simplifies the balance calculation algorithm.

## 6. Balance Calculation and Debt Simplification (Aisha & Rohan)
**Options Considered**: 
- Show a complex graph of every individual debt.
- Show a unified simplified debt graph.

**Decision**: Both!
**Why**: Aisha wanted "one number per person. Who pays whom". We implemented a greedy debt simplification algorithm that groups all positive and negative balances to generate a minimal set of transactions. Rohan wanted to see exactly which expenses made up his balance, so we also built a detailed user breakdown page showing the transaction history.
