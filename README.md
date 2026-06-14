# Shared Expenses App

A robust shared expenses tracker built specifically for dynamic flatmate setups. It handles complex split types, multi-currency expenses, and dynamic group memberships out of the box. 

## Tech Stack
- **Framework**: Next.js 13+ (App Router, Server Actions)
- **Database**: SQLite (via Prisma ORM)
- **Styling**: Vanilla CSS with modern premium aesthetics

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Initialize Database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Seed Database (Required for testing)**
   Populates the initial `Users`, `Group`, and dynamic `GroupMember` joins/leaves based on the scenario.
   ```bash
   npx tsx prisma/seed.ts
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## The CSV Import Workflow

1. Navigate to the **Import CSV** page.
2. Select the `expenses_export.csv` file from your local machine.
3. The server parses the file and creates an `ImportJob`.
4. You are presented with an **Anomaly Review Dashboard**. Every row from the CSV is staged here.
5. Review the 15 distinct detected anomalies (Duplicates, Name Inconsistencies, Invalid Dates, Inactive Members, etc.). 
6. Approve or Reject each row. You can manually edit the raw data string before approving.
7. Click **Commit Import** to generate the actual `Expense` and `Settlement` database records.

## AI Usage
This application was developed using an autonomous AI coding agent. See `AI_USAGE.md` for a log of the AI's mistakes and corrections. See `DECISIONS.md` for the architectural and product decision log. See `SCOPE.md` for the detailed anomaly log and database schema.
