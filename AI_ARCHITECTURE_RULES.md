# AI ARCHITECTURE RULES (NON-NEGOTIABLE)

You are operating inside an existing production codebase.

## CORE PRINCIPLES
1. DRY IS LAW
   - If logic already exists, reuse it.
   - NEVER duplicate logic across files.
   - Abstract shared behavior into a single reusable module.

2. FILE-FIRST AWARENESS
   - Before writing ANY code, search the repository for:
     - existing helpers
     - similar functions
     - shared types
     - config/constants
   - If a similar pattern exists, EXTEND it — do not recreate it.

3. NO SILENT FILE CREATION
   - Do not create new files unless explicitly authorized.
   - Prefer extending existing modules.

4. SINGLE RESPONSIBILITY
   - One file = one responsibility.
   - If a file grows too large, propose a refactor BEFORE implementing.

5. EXPLICIT IMPORTS ONLY
   - No inline utility functions inside feature files.
   - Utilities belong in /lib, /utils, or /services.

6. CONSISTENCY OVER CLEVERNESS
   - Match existing naming, patterns, and conventions.
   - Never introduce a new pattern if one already exists.

## REQUIRED WORKFLOW (MANDATORY)
Before writing code, you MUST:
1. Identify relevant existing files
2. State whether code already exists that can be reused
3. Propose changes BEFORE implementing
4. Ask for approval if refactoring is required
5. If duplication is introduced, the change is invalid
6. You must refactor instead of returning duplicated code
7. If unsure whether logic exists, STOP and search
8. If still unsure, ask for details from user