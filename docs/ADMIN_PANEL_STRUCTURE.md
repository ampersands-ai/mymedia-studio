# Admin Panel Structure Documentation

**Last Updated**: November 2025
**Total Pages**: 26 active admin pages
**Total Components**: 67 components across 6 categories

---

## Overview

The admin panel provides comprehensive management tools for ARTIFIO.AI's AI models, templates, users, and system monitoring.

## Admin Pages by Category

### 📊 Dashboard & Analytics

#### AdminDashboard.tsx
**Route**: `/admin/dashboard`
**Purpose**: Main landing page with key metrics overview
**Features**:
- Model counts (total, active)
- Template counts (total, active)
- Generation stats (today, all-time)
- API quota monitoring
- Community settings toggle
- Model health widget

#### Analytics.tsx
**Route**: `/admin/analytics`
**Sidebar**: ✅ Linked
**Purpose**: Platform-wide analytics dashboard
**Features**:
- User growth metrics (total, today, week, month)
- Generation statistics (total, completed)
- Conversion rates (free vs paid)
- Top 5 models by usage
- 30-day trends (signups, generations)

#### AdvancedAnalytics.tsx
**Route**: `/admin/advanced-analytics`
**Sidebar**: ❌ NOT linked (hidden page!)
**Purpose**: Detailed analytics with engagement metrics
**Features**:
- Activity trends (downloads, shares, views, generations)
- Template performance metrics
- Token economics by model
- User engagement statistics
- Success/failure rates

**🔧 RECOMMENDATION**: Add to sidebar as "Advanced Analytics"

#### TemplateAnalytics.tsx
**Route**: `/admin/template-analytics`
**Sidebar**: ✅ Linked
**Purpose**: Template-specific performance tracking
**Features**:
- Template view counts
- Template usage statistics
- Conversion rates per template

---

### 🤖 Model Management

#### AIModelsManager.tsx
**Route**: `/admin/models`
**Purpose**: Registry-based AI model management
**Architecture**: Loads models from `src/lib/models/locked/` TypeScript files
**Features**:
- View all 71 models from registry
- Filter by provider, content type, status, lock status
- Sort by name, cost, duration, provider
- Edit model configuration (generates migration script)
- Duplicate models
- Lock/unlock models
- Enable/disable models in bulk
- Download migration scripts for changes

**Key Workflow**:
1. Make changes in UI → Queued as pending changes
2. Download migration script → Contains all pending changes
3. Run script locally → Updates TypeScript model files
4. Commit to git → Changes version controlled

#### ModelHealthDashboard.tsx
**Route**: `/admin/model-health`
**Purpose**: Monitor health and performance of all models
**Features**:
- Grid/list view of all models with health status
- Filter by provider, content type, status
- Individual model testing (navigates to `/admin/model-health/test/:recordId`)
- Comprehensive testing (navigates to `/admin/model-health/comprehensive-test`)
- Bulk testing controls
- Performance metrics
- Test history

#### ModelHealthTestPage.tsx
**Route**: `/admin/model-health/test/:recordId`
**Purpose**: Test individual model with execution flow tracking
**Features**:
- Execute model with custom parameters
- Real-time flow tracking (API calls, responses)
- Parameter inspection
- Test result visualization
- Media preview for outputs

#### ComprehensiveModelTestPage.tsx
**Route**: `/admin/model-health/comprehensive-test`
**Purpose**: Advanced model testing with schema editing
**Features**:
- All features of ModelHealthTestPage
- Schema editor for modifying input parameters
- Documentation generation
- Parameter metadata inspection
- Bulk testing capabilities

**🔧 NOTE**: Both testing pages serve different purposes and are actively used from ModelHealthDashboard.

#### TestModelGroupPage.tsx
**Route**: `/admin/test-model-group`
**Sidebar**: ✅ Linked
**Purpose**: Group-based model testing interface
**Features**:
- Test all models in a content type group
- Batch execution
- Group performance metrics

#### ModelAlerts.tsx
**Route**: `/admin/model-alerts`
**Purpose**: Configure email alerts for model failures
**Features**:
- Set failure thresholds per model
- Email notification configuration
- Alert history

**🔧 RECOMMENDATION**: Integrate as tab in ModelHealthDashboard

---

### 📄 Template Management (FRAGMENTED)

#### TemplatesManager.tsx
**Route**: `/admin/templates`
**Purpose**: Unified manager for content templates and workflows
**Features**:
- Create/edit/delete templates
- Manage workflow templates
- Template categories
- Active/inactive status

#### TemplateLandingManager.tsx
**Route**: `/admin/template-landing`
**Sidebar**: ✅ Linked as "Landing Pages"
**Purpose**: Manage template landing pages
**Features**:
- List all landing pages
- Create new landing pages
- Edit existing pages
- Publish/unpublish status

#### TemplateLandingEditor.tsx
**Route**: `/admin/template-landing/:id`
**Purpose**: Edit individual template landing page
**Features**:
- Hero section editor
- Features list editor
- Before/after images
- SEO metadata
- Call-to-action configuration

#### TemplateCategoriesManager.tsx
**Route**: `/admin/template-categories`
**Sidebar**: ✅ Linked as "Categories"
**Purpose**: Manage template categories
**Features**:
- Create/edit/delete categories
- Category ordering
- Icon selection

**🚨 CONSOLIDATION NEEDED**: These 3 pages should be unified into single "Template Landing" page with tabs:
- Tab 1: Landing Pages (list/manage)
- Tab 2: Categories
- Tab 3: Editor (when page selected)

---

### 👥 User Management

#### UsersManager.tsx
**Route**: `/admin/users`
**Purpose**: Comprehensive user management
**Features**:
- View all users with pagination
- Search and filter users
- Manage subscriptions
- Credit management (add/deduct credits)
- Grant/revoke admin roles
- View user activity
- Ban/unban users

#### UserLogs.tsx
**Route**: `/admin/user-logs`
**Sidebar**: ✅ Linked
**Purpose**: View user error logs
**Features**:
- Filter by user, date, severity
- View stack traces
- Error grouping

**🔧 RECOMMENDATION**: Integrate into unified "Error Monitoring" dashboard

---

### 🔍 Monitoring & Operations

#### WebhookMonitor.tsx
**Route**: `/admin/webhook-monitor`
**Sidebar**: ✅ Linked
**Purpose**: Comprehensive webhook monitoring
**Architecture**: Well-organized with 13 sub-components
**Features**:
- Real-time webhook feed
- Provider statistics
- Event volume charts
- Error analysis
- Alert configuration
- Alert history
- Active generations list

**✅ WELL STRUCTURED**: Good example of component organization

#### APIHealthMonitor.tsx
**Route**: `/admin/api-health`
**Purpose**: External API health monitoring
**Features**:
- Monitor all provider APIs (KIE AI, Runware, ElevenLabs, etc.)
- Response time tracking
- Error rate monitoring
- Uptime statistics

#### VideoJobs.tsx
**Route**: `/admin/video-jobs`
**Sidebar**: ✅ Linked
**Purpose**: Monitor faceless video generation jobs
**Features**:
- View all video jobs
- Status tracking (pending, processing, completed, failed)
- Job details and logs
- Manual retry/cancel

---

### 📧 Email Management

#### EmailSettings.tsx
**Route**: `/admin/email-settings`
**Sidebar**: ✅ Linked
**Purpose**: Configure email system
**Features**:
- SMTP settings
- Email templates
- Send test emails

#### EmailHistory.tsx
**Route**: `/admin/email-history`
**Purpose**: View email send history
**Features**:
- List all sent emails
- Filter by recipient, status, date
- View email content
- Resend failed emails

**🔧 RECOMMENDATION**: Combine into single "Email Management" page with tabs

---

### 📝 Content Management

#### AllGenerations.tsx
**Route**: `/admin/generations`
**Purpose**: View and manage all user generations
**Features**:
- List all generations across platform
- Filter by user, model, status
- Community sharing controls (enable/disable sharing per generation)
- Delete generations
- View generation details

#### CreateBlog.tsx
**Route**: `/admin/blog/create`
**Sidebar**: ✅ Linked
**Purpose**: Create blog content
**Features**:
- Markdown editor
- SEO metadata
- Publish/draft status

#### CinematicPromptsManager.tsx
**Route**: `/admin/cinematic-prompts`
**Sidebar**: ✅ Linked
**Purpose**: Manage cinematic prompt library
**Features**:
- Create/edit/delete prompts
- Categorize prompts
- Search prompts

---

### ⚙️ Operations & Utilities

#### TokenDisputes.tsx
**Route**: `/admin/disputes`
**Purpose**: Handle token dispute resolution
**Features**:
- View disputed transactions
- Approve/deny refunds
- Add notes to disputes
- View dispute history

#### ThresholdBreach.tsx
**Route**: `/admin/threshold-breach`
**Sidebar**: ✅ Linked
**Purpose**: Monitor threshold breaches
**Features**:
- View breached thresholds
- Alert when limits exceeded
- Historical breach data

**🔧 NOTE**: Verify if still in use vs newer alert systems

#### MigrateStoryboards.tsx
**Route**: `/admin/migrate-storyboards`
**Purpose**: One-time migration tool for storyboards
**Status**: Likely completed, candidate for archival

**🔧 RECOMMENDATION**: Remove or move to archived utilities

---

## Admin Components Structure

### Model Health Components (25 components)
**Location**: `src/components/admin/model-health/`
**Purpose**: Comprehensive model testing and monitoring UI

**✅ WELL ORGANIZED**: Logically grouped and clearly named

**Components**:
- `BulkTestControls.tsx` - Bulk testing interface
- `ExecutionFlowVisualizer.tsx` - API execution visualization
- `FlowStepTooltip.tsx`, `FlowTimeline.tsx`, `FlowTrackingDialog.tsx` - Flow tracking UI
- `InspectionReviewCard.tsx`, `InspectionStepsDisplay.tsx` - Test inspection
- `MediaPreview.tsx` - Preview generated outputs
- `ModelAlertSettings.tsx` - Alert configuration
- `ModelHealthFilters.tsx`, `ModelHealthHeader.tsx`, `ModelHealthWidget.tsx` - Dashboard UI
- `ModelTestCard.tsx`, `ModelTestGrid.tsx` - Model display cards
- `ParameterMetadataCard.tsx`, `ParametersInspector.tsx` - Parameter inspection
- `PerformanceCharts.tsx` - Performance visualization
- `ScheduleDialog.tsx`, `SchedulesList.tsx` - Test scheduling
- `TestConfigDialog.tsx`, `TestFlowTimeline.tsx` - Test configuration
- `TestHistoryDialog.tsx`, `TestHistoryTable.tsx`, `TestResultsCard.tsx`, `TestStatusHeader.tsx` - Test history

### Webhook Components (13 components)
**Location**: `src/components/admin/webhook/`
**Purpose**: Webhook monitoring and analytics

**✅ WELL ORGANIZED**: Clear separation of concerns

**Components**:
- `ActiveGenerationsList.tsx` - Active generations display
- `AlertConfigurationPanel.tsx`, `AlertHistoryDashboard.tsx`, `AlertHistoryFilters.tsx`, `AlertHistoryTable.tsx`, `AlertSettingsPanel.tsx`, `AlertTrendsChart.tsx` - Alert management
- `ErrorAnalysisPanel.tsx`, `WebhookErrorAnalysisPanel.tsx` - Error analysis (⚠️ DUPLICATE)
- `LiveWebhookFeed.tsx` - Real-time feed
- `WebhookActionsPanel.tsx`, `WebhookAnalyticsDashboard.tsx` - Analytics
- `WebhookAnalyticsSummaryCards.tsx`, `WebhookCharts.tsx`, `WebhookEventVolumeChart.tsx`, `WebhookProviderStatsTable.tsx`, `WebhookStatsCards.tsx` - Metrics and charts

**🔧 RECOMMENDATION**: Consolidate ErrorAnalysisPanel and WebhookErrorAnalysisPanel

### Workflow Components (6 components)
**Location**: `src/components/admin/workflow/`
**Purpose**: Workflow template management

**Components**:
- `WorkflowBasicInfo.tsx` - Workflow metadata
- `WorkflowBeforeAfterImages.tsx` - Image display
- `WorkflowEditorDialog.tsx`, `WorkflowEditorForm.tsx` - Editing UI
- `WorkflowStepsManager.tsx` - Step management
- `WorkflowUserFields.tsx` - User input configuration

### Template Components (5 components)
**Location**: `src/components/admin/templates/`
**Purpose**: Template UI components

**Components**:
- `CategoryFilter.tsx` - Category filtering
- `EmptyTemplatesState.tsx` - Empty state
- `TemplateActions.tsx` - Action buttons
- `TemplatesCard.tsx` - Template card
- `TemplatesHeader.tsx`, `TemplatesTable.tsx` - List UI

### Template Landing Components (1 component)
**Location**: `src/components/admin/template-landing/`

**Components**:
- `ImageUploader.tsx` - Image upload utility

### Core Admin Components (12 components)
**Location**: `src/components/admin/`
**Purpose**: Shared admin utilities

**Components**:
- `DocumentationViewer.tsx` - View model docs
- `GroupTestRunner.tsx` - Group testing
- `ModelFormDialog.tsx` - Add/edit models
- `ParameterConfigurator.tsx`, `ParameterDialog.tsx` - Parameter config
- `RegenerateAllModelsButton.tsx` - Bulk regeneration
- `SchemaBuilder.tsx` - JSON schema editor
- `TemplateFormDialog.tsx` - Add/edit templates
- `WorkflowBuilder.tsx`, `WorkflowStepForm.tsx`, `WorkflowTestDialog.tsx`, `WorkflowVisualPreview.tsx` - Workflow management

---

## Issues and Recommendations

### 🚨 High Priority

1. **Add AdvancedAnalytics to Sidebar**
   - Route exists but not linked
   - Hidden functionality needs exposure

2. **Consolidate Template Landing Pages**
   - 3 separate pages (Manager, Editor, Categories)
   - Should be single page with tabs
   - Reduces navigation complexity

3. **Remove Duplicate Error Analysis**
   - `ErrorAnalysisPanel.tsx` vs `WebhookErrorAnalysisPanel.tsx`
   - Consolidate into single component

### 🔧 Medium Priority

4. **Merge Email Management**
   - EmailSettings + EmailHistory → Single page with tabs

5. **Integrate Model Alerts**
   - Add ModelAlerts as tab in ModelHealthDashboard
   - Reduces separate navigation

6. **Review Utility Pages**
   - MigrateStoryboards.tsx - Likely one-time use, archive?
   - ThresholdBreach.tsx - Verify if needed vs newer alerts
   - TokenDisputes.tsx - Verify usage frequency

### ✅ Well-Structured Areas

- **Webhook monitoring** - 13 components, excellently organized
- **Model health** - 25 components, logical grouping
- **AI Models Manager** - Registry-based architecture is elegant

---

## Navigation Structure

### Sidebar Links (AdminLayout.tsx)

Current sidebar order:
1. User Dashboard (exit to user view)
2. Overview (AdminDashboard)
3. **Analytics** (basic)
4. Create Blog
5. AI Models
6. Templates
7. Users
8. All Generations
9. Token Disputes
10. Threshold Breach
11. Model Health
12. Test Model Group
13. Webhook Monitor
14. User Logs
15. Email Settings
16. Video Jobs
17. Landing Pages
18. Categories
19. **Template Analytics**
20. Cinematic Prompts

**Missing from sidebar**:
- Advanced Analytics (`/admin/advanced-analytics`)
- Model Alerts (`/admin/model-alerts`)
- API Health (`/admin/api-health`)
- Email History (`/admin/email-history`)

**🔧 RECOMMENDATION**: Reorganize sidebar into logical groups:

```
Admin Panel
├─ Dashboard
│  ├─ Overview
│  ├─ Analytics
│  └─ Advanced Analytics
│
├─ Content Management
│  ├─ AI Models
│  ├─ Templates
│  ├─ Landing Pages
│  ├─ Categories
│  └─ Cinematic Prompts
│
├─ User Management
│  ├─ Users
│  ├─ All Generations
│  └─ Token Disputes
│
├─ Monitoring
│  ├─ Model Health
│  ├─ Model Alerts
│  ├─ API Health
│  ├─ Webhook Monitor
│  └─ Video Jobs
│
├─ System
│  ├─ Email Settings
│  ├─ Email History
│  ├─ User Logs
│  └─ Threshold Breach
│
└─ Content
   └─ Create Blog
```

---

## Testing Status

### ✅ Connected and Functional
- AdminDashboard
- AIModelsManager (registry-based)
- ModelHealthDashboard
- UsersManager
- WebhookMonitor

### ⚠️ Needs Verification
- ThresholdBreach (may be superseded)
- MigrateStoryboards (one-time use?)
- TokenDisputes (usage frequency?)

### 🔧 Needs Improvement
- Template Landing pages (consolidation needed)
- Duplicate error analysis components
- Hidden AdvancedAnalytics page

---

## Architecture Highlights

### Registry-Based Model System
**File**: `src/pages/admin/AIModelsManager.tsx`
**Architecture**: Loads from `src/lib/models/locked/` TypeScript files

**Workflow**:
1. Models stored as TypeScript files (version controlled)
2. Admin UI generates migration scripts for changes
3. Scripts downloaded and run locally
4. Changes committed to git

**Benefits**:
- Git-trackable changes
- Lock protection for production models
- No dynamic code execution
- Clear audit trail

### Component Organization Best Practices
**Example**: Webhook components (`src/components/admin/webhook/`)
- Logical grouping by feature area
- Clear naming conventions
- Separation of concerns
- Reusable sub-components

---

## Summary Statistics

- **26 Active Admin Pages** (3 removed: ErrorDashboard, EnhancedErrorDashboard, EnhancedErrorDashboard.disabled)
- **67 Admin Components** across 6 categories
- **20 Sidebar Links** (4 pages accessible only by direct route)
- **71 AI Models** managed via registry
- **5 Main Feature Areas**: Dashboard, Models, Templates, Users, Monitoring

**Potential Optimizations**:
- **30% page reduction possible** (26 → ~18 pages) via consolidation
- **Improved navigation** with hierarchical sidebar
- **Better discoverability** by exposing hidden pages
