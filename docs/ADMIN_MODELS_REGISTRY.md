# AI Models Admin - Registry-Based Management

## Overview

The AI Models Admin now reads directly from your TypeScript model files (`src/lib/models/locked/`) instead of the database. This ensures your `.ts` files are the **single source of truth** for all model metadata.

## Key Features

✅ **Read from Registry**: All models loaded from `.ts` files
✅ **Script-Based Edits**: Changes generate migration scripts
✅ **Lock Protection**: Locked models cannot be modified
✅ **Same UI**: Familiar interface with new backend
✅ **Git-Friendly**: All changes tracked in version control

## How It Works

```
┌─────────────────┐
│  Admin UI       │ ← Reads models from registry
│  (Browser)      │
└────────┬────────┘
         │ Make changes
         ▼
┌─────────────────┐
│  Generate       │ ← Creates Node.js script
│  Migration      │
│  Script         │
└────────┬────────┘
         │ Download script
         ▼
┌─────────────────┐
│  Run Locally    │ ← Updates .ts files
│  node update.cjs│
└────────┬────────┘
         │ Commit changes
         ▼
┌─────────────────┐
│  Git Commit     │ ← Source of truth updated
│  & Deploy       │
└─────────────────┘
```

## Using the Admin Interface

### 1. View Models

Navigate to Admin → AI Models. You'll see all models loaded from the registry with:
- ✅ Lock status (locked/unlocked)
- ✅ All model metadata
- ✅ Current configuration values
- ✅ Filtering and sorting options

### 2. Edit a Model

**Step 1: Make Changes in UI**
1. Click Edit button on any unlocked model
2. Modify fields in the form
3. Click Save

**Step 2: Download Script**
- Changes are queued (shown in orange alert box)
- Click "Download Script" button
- Save the `.cjs` file to your project root

**Step 3: Apply Changes**
```bash
# Run the downloaded script
node update-models-1234567890.cjs

# Review changes
git diff src/lib/models/locked/

# Commit
git add src/lib/models/locked/
git commit -m "Update model configurations"

# Push
git push
```

**Step 4: Deploy**
- Changes take effect on next deployment
- Or refresh the admin page to see updates

### 3. Add a New Model

**Step 1: Create in UI**
1. Click "New Model" button
2. Fill out all required fields
3. Click Save

**Step 2: Download Creation Script**
- Script downloads automatically
- Named like `create-Model_Name.cjs`

**Step 3: Create Model File**
```bash
# Run the creation script
node create-Model_Name.cjs

# This creates: src/lib/models/locked/[contentType]/Model_Name.ts
```

**Step 4: Implement Model Logic**
Edit the generated file and implement:
- `execute()` - Model execution logic
- `validate()` - Input validation
- `calculateCost()` - Cost calculation
- `SCHEMA` - Input parameter schema

**Step 5: Register Model**
Add import and export in `src/lib/models/locked/[contentType]/index.ts`:
```typescript
export * as ModelName from './Model_Name';
```

### 4. Toggle Model Status (Active/Inactive)

**For Unlocked Models:**
1. Click Power button to toggle
2. Change is queued
3. Download and run update script
4. Commit changes

**For Locked Models:**
- Cannot toggle - unlock first

### 5. Duplicate a Model

1. Click Copy button
2. Edit the duplicated model details
3. Download creation script
4. Run script to create new file

### 6. Lock/Unlock Models

**Why Lock?**
- Prevent accidental modifications
- Protect production-critical models
- Ensure stability

**How to Lock:**
1. Click Lock icon (🔓) on unlocked model
2. Download lock script
3. Run: `node lock-model-abc12345.cjs`
4. Commit changes
5. Model is now locked (🔒)

**How to Unlock:**
1. Click Lock icon (🔒) on locked model
2. Download unlock script
3. Run: `node unlock-model-abc12345.cjs`
4. Commit changes
5. Model is now unlocked (🔓)

**Locked Model Restrictions:**
- ❌ Cannot edit
- ❌ Cannot toggle active/inactive
- ❌ Cannot delete/deactivate
- ✅ Can view
- ✅ Can duplicate

### 7. Bulk Operations

**Enable All Unlocked Models:**
1. Click "Enable All" button
2. Download bulk update script
3. Run script
4. Commit changes

**Disable All Unlocked Models:**
1. Click "Disable All" button
2. Confirm action
3. Download bulk update script
4. Run script
5. Commit changes

### 8. Filter Models

Click "Filters" button to filter by:
- **Search**: Model ID, name, or provider
- **Provider**: Filter by provider (kie_ai, runware, etc.)
- **Content Type**: Filter by type (prompt_to_image, etc.)
- **Status**: Active or Inactive only
- **Lock Status**: Locked or Unlocked only
- **Group**: Filter by creation group

### 9. Sort Models

Use sort dropdown to order by:
- Model Name (A-Z)
- Provider (A-Z)
- Content Type
- Base Cost (lowest first)
- Duration (fastest first)
- Status (active first)

## Workflow Examples

### Example 1: Update Model Cost

```bash
# 1. In Admin UI
#    - Edit "FLUX.1 Pro" model
#    - Change base_token_cost from 0.2 to 0.25
#    - Click Save
#    - Download update script

# 2. Apply changes
node update-models-1700000000.cjs
# Output:
# 📝 Updating: FLUX_1_Pro.ts
#   ✓ Updated base_token_cost
#   ✅ Saved changes

# 3. Verify
git diff src/lib/models/locked/prompt_to_image/FLUX_1_Pro.ts
# Shows: baseCreditCost: 0.25

# 4. Commit
git add src/lib/models/locked/prompt_to_image/FLUX_1_Pro.ts
git commit -m "Adjust FLUX.1 Pro cost to 0.25 credits"
git push
```

### Example 2: Lock Production Model

```bash
# 1. In Admin UI
#    - Find "Sora 2 by OpenAI" model
#    - Click 🔓 (unlock icon)
#    - Download lock script

# 2. Apply lock
node lock-model-11a995d9.cjs
# Output:
# 📝 Updating: Sora_2_by_OpenAI_Watermarked.ts
#   ✓ Updated is_locked
#   ✅ Saved changes

# 3. Commit
git add .
git commit -m "Lock Sora 2 model for production stability"
git push

# 4. Verify in Admin UI
#    - Refresh page
#    - Model shows 🔒 icon
#    - Edit button is disabled
```

### Example 3: Create New Model

```bash
# 1. In Admin UI
#    - Click "New Model"
#    - Fill form:
#      * Model ID: "newprovider/amazing-model"
#      * Model Name: "Amazing Model"
#      * Provider: "newprovider"
#      * Content Type: prompt_to_image
#      * Base Cost: 2.0
#      * ...
#    - Click Save
#    - Script downloads automatically

# 2. Create model file
node create-Amazing_Model.cjs
# Output:
# ✅ Created model file: src/lib/models/locked/prompt_to_image/Amazing_Model.ts
#
# 📋 Next steps:
# 1. Edit the file to implement execute(), validate(), and calculateCost()
# 2. Update SCHEMA with correct input parameters
# 3. Import in src/lib/models/locked/prompt_to_image/index.ts
# 4. Add to registry exports
# 5. Test the model
# 6. Commit

# 3. Implement the model
code src/lib/models/locked/prompt_to_image/Amazing_Model.ts
# Implement execute(), validate(), calculateCost()

# 4. Register in index.ts
echo "export * as AmazingModel from './Amazing_Model';" >> src/lib/models/locked/prompt_to_image/index.ts

# 5. Test
npm run dev
# Test in UI

# 6. Commit
git add .
git commit -m "Add Amazing Model"
git push
```

## Troubleshooting

### Q: Changes not appearing in UI?

A: Click the "Refresh" button to reload models from registry.

### Q: Script says "Could not find model file"?

A: Ensure:
1. Record ID is correct
2. File exists in one of the locked directories
3. File contains the exact recordId string

### Q: Can't edit a model?

A: Check if model is locked (🔒 icon). Unlock it first if needed.

### Q: Pending changes disappeared?

A: Pending changes are stored in browser memory. Download the script before refreshing the page.

### Q: How to restore database-based admin?

A: The old version is backed up at:
```bash
src/pages/admin/AIModelsManager.database.tsx.backup
```

Rename it back to restore database functionality.

## Architecture Benefits

### ✅ Single Source of Truth
- Model definitions live in `.ts` files
- No database/code sync issues
- Git tracks all changes

### ✅ Type Safety
- TypeScript interfaces enforced
- Compile-time validation
- No runtime surprises

### ✅ Code Review
- All changes go through git
- Team can review model updates
- Rollback is easy (`git revert`)

### ✅ Deployment Safety
- Locked models protected
- Changes are explicit (not automatic)
- Staging environment can test first

### ✅ Developer Experience
- Edit in code or UI
- Changes are transparent
- No magic database updates

## Migration from Database

If you have models in the database that need migrating:

1. **Export from Database** (use old admin backup)
2. **Create Model Files** using creation scripts
3. **Implement Logic** in generated files
4. **Test Thoroughly**
5. **Commit to Git**
6. **Deactivate Database Models** (optional)

## Best Practices

### 🔒 Lock Production Models
Lock any model that's:
- In active use by customers
- Revenue-generating
- Stability-critical

### 📝 Descriptive Commit Messages
```bash
# Good
git commit -m "Reduce FLUX Pro cost for Black Friday promo"

# Bad
git commit -m "Update model"
```

### 🧪 Test in Staging First
- Apply scripts in staging environment
- Test model behavior
- Then apply to production

### 📊 Batch Related Changes
Queue multiple changes, then download one script:
```bash
# Instead of 10 separate scripts, queue all changes
# Then download one comprehensive update script
```

### 🔄 Regular Refreshes
Click "Refresh" after:
- Running update scripts
- Other developers push changes
- Deployment completes

## Security Notes

- ✅ Only admins can access this interface
- ✅ Scripts must be run with filesystem access
- ✅ Locked models prevent accidents
- ✅ All changes are auditable in git

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify TypeScript compilation: `npm run build`
3. Ensure all model files have valid syntax
4. Check git status for conflicts

## Next Steps

1. ✅ Familiarize yourself with the interface
2. ✅ Try editing a non-critical model
3. ✅ Lock your production models
4. ✅ Set up a staging environment workflow
5. ✅ Train your team on the new process
