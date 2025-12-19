# Archived Files

This folder contains files that were archived during the MoveX consolidation process.

## frontend-ai-generated/

This folder was the AI-generated parallel frontend that violated the single-port architecture.

**Why archived:**
- Created duplicate frontend on separate port (3000/5173)
- Violated owner-defined single-port requirement (port 4000 only)
- Caused session isolation issues due to cross-origin storage
- Conflicted with OAuth redirect URI requirements

**Resolution:**
- All frontend functionality consolidated to root-level files
- Backend now serves static files on single port
- Single origin architecture restored

Date archived: 2025-12-15
