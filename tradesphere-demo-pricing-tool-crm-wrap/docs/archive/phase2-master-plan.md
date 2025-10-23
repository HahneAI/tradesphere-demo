# Phase 2: Materials Management System - Master Implementation Plan

## Vision & Core Objectives

### Business Goals
1. **Replace simple multipliers** with real material costs from database
2. **Service-specific material categories** - Each service defines its own material requirements
3. **Real-time cost calculation** - Materials feed into Tier 2 pricing as actual costs
4. **Visual material selection** - Images improve UX and reduce selection errors
5. **Company-controlled pricing** - Each company maintains their own supplier pricing

### Industry Validation
**Strengths of this approach:**
- Service-specific material categories (matches RSMeans methodology)
- Company + Service scoping (proper multi-tenancy)
- Manual material data entry (contractors control their supplier pricing)
- Material images (visual selection improves UX and reduces errors)

**Critical Considerations:**
- Unit of Measure Flexibility (cubic yards, square feet, linear feet, per piece, per pallet)
- Waste Factor Critical (10% standard, 15-25% for complex cuts)
- Coverage Calculations (each material has unique coverage rates)
- Material Layers (sequential calculation order matters)
- Compaction Factors (base materials shrink 20% when compacted)

---

## Database Architecture

### Tables Overview
Two new tables work together to create the materials system:

**service_material_categories** - Defines what material types a service needs (e.g., paver patios need: base rock, fabric, pavers, edging, sand). Each category has a calculation method (volume_depth, area_coverage, or linear_perimeter) and configuration like default depths and waste factors.

**service_materials** - Individual material records within each category (e.g., "Bulk Limestone Clean 3/4-1 inch" under base_rock category). Contains pricing, coverage rates, physical properties, and images.

### Key Relationships
Materials belong to categories, categories belong to service configs, service configs belong to companies. This creates proper data isolation where TradeSphere Demo Company's "Standard Concrete Paver" is completely separate from another company's materials even for the same service type.

Foreign keys ensure referential integrity - deleting a service config cascades to delete its categories and materials. Deleting a material triggers automatic image cleanup from storage.

### Data Access Pattern
The primary query joins categories with their materials, ordered by category sort order and whether each material is marked as default. This single query powers the Materials Tab display, showing expandable category sections with radio-button material selection.

Query filters by company_id and service_config_id to ensure proper multi-tenancy. Only active materials are returned. Results include all fields needed for display (names, prices, images) and calculation (coverage rates, waste factors, depths).

---

## Material Calculation Methods

### Three Calculation Types

**Volume Depth (Base Rock, Clean Rock)**
Used for materials that fill 3D space at a specific depth. Takes project square footage and depth in inches, converts to cubic yards. Example: 360 sqft patio with 6 inch base needs 6.67 cubic yards before waste and compaction.

Calculation flow: Convert square feet and depth to cubic feet, divide by 27 for cubic yards, apply compaction factor (base materials settle 20%), apply waste factor (typically 10%), round up to nearest quarter yard for ordering.

**Area Coverage (Pavers, Fabric, Polymeric Sand)**
Used for materials that cover 2D surface area. Takes project square footage divided by coverage per unit. Example: Pavers sold per sqft have 1:1 coverage, fabric rolls might cover 250 sqft each.

Calculation flow: Divide project area by coverage rate, apply waste factor (10-25% depending on cutting complexity), round up to whole units for ordering.

**Linear Perimeter (Edging)**
Used for materials that run along edges. Since users input square footage not dimensions, perimeter is estimated assuming rectangular shape with 1.5:1 ratio. Example: 360 sqft patio estimated as 15ft x 24ft = 78ft perimeter.

Calculation flow: Estimate perimeter from area using rectangular assumption, apply waste factor (10%), round up to whole linear feet. User can override with custom perimeter if known.

### Waste and Compaction Factors
Each material has percentage modifiers stored in database. Waste accounts for cuts, breakage, overlap. Compaction accounts for settling under compression. These multiply the base quantity before final cost calculation.

---

## Tier 2 Integration: Replacing Old Multipliers

### The Old System (Phase 1)
Paver patio service used a simple material cost calculation: square footage times $5.84 base rate times a style multiplier (1.0 for standard, 1.2 for premium). This produced estimated material costs but wasn't based on actual supplier pricing.

For a 360 sqft patio with standard pavers and 10% waste: 360 × $5.84 × 1.0 × 1.10 = $2,304.96 total material cost.

### The New System (Phase 2)
Material cost now comes from the materials database. Each of the 6 categories (base rock, clean rock, fabric, pavers, edging, polymeric sand) calculates independently using real prices and quantities, then sums for total.

Same 360 sqft patio example with actual materials:
- Base rock: 9 cubic yards at $36.75/cy = $330.75
- Clean rock: 3 cubic yards at $19.90/cy = $59.70
- Fabric: 2 rolls at $199.66/roll = $399.32
- Pavers: 396 sqft at $5.17/sqft = $2,047.32
- Edging: 86 linear feet at $1.24/lf = $106.64
- Polymeric sand: 5 bags at $37.60/bag = $188.00
- **Total: $3,131.73** (vs old system's $2,304.96)

The new system is more expensive but accurate. The old $5.84 baseline didn't account for all material layers and real supplier pricing.

### Integration Point
The material calculation engine returns total material cost which feeds directly into Tier 2 of the service pricing formula. Instead of the old material_cost line using a multiplier, it now uses the sum from calculateMaterialCosts(). The rest of Tier 2 (labor cost, equipment, obstacles, profit) remains unchanged.

---

## Frontend State Management

### React State Structure
Materials Tab maintains several pieces of state working together:

**categories** - Array of category definitions loaded from database, sorted by sort_order
**materialsByCategory** - Object mapping category keys to arrays of available materials
**selectedMaterials** - Object tracking which material ID is selected per category, plus calculated quantity and cost
**totalMaterialsCost** - Sum of all category costs for display in pricing preview
**isCalculating** - Loading state during async calculation calls

### State Flow
On tab mount, fetch categories and materials for selected service. Default materials auto-selected based on is_default flag. When user changes material selection, trigger recalculation. Calculation returns quantities and costs per category, state updates, UI reflects new totals.

State syncs between Materials Tab and Quick Calculator so material selections persist when switching between tabs. When generating quote, selected materials IDs are passed to pricing engine.

---

## Validation & Business Rules

### Required Category Validation
Before allowing quote generation, system checks that all categories marked is_required have a material selected. Missing required materials throws validation error listing which categories need selection.

Example: If pavers category is required but user hasn't selected a material, show error "Missing required materials: Paver Blocks" and disable quote button.

### Single Selection Per Category
Each category can only have ONE material selected at a time. UI enforces this with radio buttons not checkboxes. Selecting new material in category automatically deselects previous choice.

### Default Material Logic
Each category should have exactly one material marked is_default. On first load, defaults are auto-selected. If no default exists, first material in list is selected. If category has no materials at all, validation prevents quote generation.

### Data Integrity Rules
Materials can only belong to categories that exist for their service. Deleting category cascades to delete all its materials. Deleting service config cascades to delete categories and materials. Images are automatically removed from storage when material is deleted via database trigger.

---

## User Permissions System

### Admin & Owner - Full Access
Admins and company owners can create, edit, and delete materials. They can upload material images, configure categories, set defaults, bulk import from CSV, and manage all aspects of the materials system.

Row Level Security policies in database check user role before allowing mutations. Storage policies restrict image upload/update/delete to admin and owner roles only.

### Regular Users - Read Only
Salespeople, field crew, and other regular users can view all materials and select materials when creating quotes, but cannot modify material records. They see "View Details" buttons instead of "Edit" buttons.

Material Editor Modal opens in read-only mode for non-admins, showing all material details but with form fields disabled and no save button. This allows verification without risk of accidental edits.

### Permission Enforcement Points
Database layer: RLS policies reject unauthorized queries
Storage layer: Supabase Storage policies reject unauthorized file operations  
API layer: Server-side role validation on mutation endpoints
UI layer: Components check user role and hide/disable admin actions

---

## Material Images System

### Storage Architecture
Supabase Storage bucket named "material-images" with public read access. Organized by company and material: company_id/material_id/filename.jpg.

Three versions of each image stored: original.jpg (full resolution as uploaded), thumbnail.jpg (200x200 for list views), preview.jpg (800x800 for modals and detail views).

### Upload Process
User selects image file in Material Editor Modal. Client-side validation checks file type (JPG/PNG/WebP only) and size (5MB max). Image is resized client-side using canvas API to generate three versions.

All three versions upload to Supabase Storage in single operation. Public URLs are retrieved and stored in material record's image_url and image_thumbnail_url columns.

### Storage Policies
Only admin and owner roles can upload, update, or delete images for their company. Policy checks user role and company_id match. All authenticated users have read access to view images.

Public read policy allows images to display without authentication for quote preview scenarios.

### Auto-Cleanup on Delete
Database trigger function fires before material deletion. Function attempts to delete all three image files from storage. Errors are ignored (file might not exist). Material record then deletes normally.

This ensures orphaned images don't accumulate in storage as materials are created and deleted over time.

---

## UI Components Architecture

### Materials Tab Component
Main entry point located at src/components/materials/MaterialsTab.tsx. Displays service selector dropdown at top, followed by category list as expandable sections.

Each category section shows category label, material count badge, and Add Material button (admin only). Expanding category reveals grid or list of materials within that category.

Tab checks user role on mount. Admin/owner see full CRUD controls. Regular users see view-only mode with selection ability but no edit/delete buttons.

### Material Editor Modal
Full-screen or large modal for creating/editing materials. Located at src/components/materials/MaterialEditorModal.tsx.

Form sections: Image upload area, Basic Info (name, category, supplier), Pricing (unit type, price), Coverage (for calculations), Physical Properties (dimensions, weight), Calculation Modifiers (waste/compaction factors), Metadata (grade, color, finish), Description.

Modal adapts to user role. Admin sees full edit form with save button. Regular user sees same layout but all fields disabled, no save button, just close button.

### Material Selector Component  
Embedded in Quick Calculator and pricing interfaces. Located at src/components/services/MaterialSelector.tsx.

Shows materials for single category as radio button selection. Supports grid view (cards with images) or list view (compact rows). Grid view prioritizes visual selection, list view shows more info per item.

Selection state controlled by parent component. When user clicks material, parent's state updates and recalculation triggers.

### Material List Item
Reusable component for displaying single material in list views. Shows thumbnail image, material name, price per unit, color badge if applicable.

Admin/owner see Edit and Delete buttons. Regular users see View Details button. Clicking any button opens Material Editor Modal in appropriate mode.

### Pricing Preview Integration
Existing PricingPreview component enhanced with materials breakdown section. Shows each category as line item: "Base Rock (6"): 2.5 cy @ $35/cy = $87.50".

Breakdown section expandable/collapsible. Shows total materials cost and materials cost per square foot. Updates in real-time as user changes selections.

---

## Migration Strategy: Phasing Out Old System

### Parallel Operation Phase
Keep existing paverStyle variable functional while building new system. Both calculation paths available, controlled by toggle flag in service config: useMaterialsDatabase boolean.

Companies can test new system without breaking existing workflows. Side-by-side comparison shows old vs new pricing.

### Migration Tool
Admin interface button "Migrate to Materials System" analyzes current $5.84 baseline cost. Creates default material records that approximately match current pricing when calculated.

After migration, service switches to useMaterialsDatabase: true. Old paverStyle variable still exists but no longer affects calculation.

### Deprecation Timeline
Week 1-2: Build parallel system, populate materials
Week 3: Add calculation toggle, A/B test 50/50 split
Week 4: Migration tool, encourage companies to switch
Week 5+: Deprecate old system, archive paverStyle variable

---

## API Endpoints Specification

### Material CRUD Operations
Material creation endpoint validates user role, creates material record, returns ID for immediate image upload.

Material update endpoint accepts partial update object, validates ownership and permissions, updates only provided fields.

Material deletion triggers cascade to remove images, returns success confirmation.

List materials endpoint filters by company and service, returns with category information joined. Supports pagination for large material libraries.

### Material Category Operations
Category creation establishes new material type for service. Includes calculation method, depth ranges, sort order.

Category update allows changing configuration without recreating materials.

Category reorder endpoint accepts array of category IDs in new order, updates sort_order values in single transaction.

### Calculation Endpoints
Calculate endpoint accepts project parameters (square footage, perimeter) and selected material IDs. Returns breakdown per category plus totals.

Preview endpoint provides quick estimate without full calculation, useful for real-time UI updates as user types square footage.

### Security Validation
All mutation endpoints check user role server-side. Admins and owners can modify materials for their company only. Regular users can only read.

Failed permission checks return 403 Forbidden with clear error message. Attempts are logged for security auditing.

---

## Phase 2 Verification Checklist

### Database Verification
Confirm 6 categories created for paver patio service with correct sort order and calculation methods. Confirm 6 default materials created (one per category) with accurate pricing and coverage data. Verify all materials have correct service_config_id linking them to paver_patio_sqft service.

Test RLS policies by attempting material edit as non-admin user, should fail. Verify image storage permissions by attempting upload as regular user, should fail.

### Calculation Verification
Run test calculation for 100 sqft project with all default materials selected. Manually calculate expected quantities for each material type:

Volume depth: Base rock should calculate to approximately 1.85 cubic yards after waste and compaction.
Area coverage: Pavers should calculate to 110 sqft after 10% waste.
Linear perimeter: Edging should calculate to approximately 44 linear feet for 100 sqft square.

Compare automated calculation results against manual calculations. Variance should be minimal (rounding only).

### UI Verification
Materials Tab displays all 6 categories in correct order. Default materials show radio button selected. Non-admin users see "View" instead of "Edit" buttons.

Image thumbnails load in grid view. Clicking material opens detail view. Price updates in real-time when changing selections.

Role-based permissions visible in UI - admin sees Add/Edit/Delete, regular user does not.

---

## Phase 2 → Phase 3 Roadmap

### Immediate (Phase 2 Complete)
Paver patio service fully integrated with materials database. Calculation engine uses real material quantities and costs. Old paverStyle variable still functional but deprecated.

Deploy A/B test: 50% of companies see new materials selector, 50% see old dropdown. Collect user feedback and performance metrics. Monitor for calculation accuracy issues.

### Phase 3 Integration
AI Chat integration allows visual material selection in conversation. When user asks about paver options, AI displays material images with pricing in chat message. User can select directly in chat without opening calculator.

Excavation service gets simplified materials system for removal/haul costs. Less complex than paver patio since materials aren't layered.

Material shopping list export generates PDF for customer showing exactly what materials and quantities are needed. Customer can take to supplier for purchasing or verify contractor's material order.

### Future Service Expansion
Retaining wall service: Block materials, cap materials, drainage gravel, geogrid fabric.

Irrigation service: PVC/poly pipes, sprinkler heads, valves, controllers, wire, connectors. Complex because materials vary by zone type.

Lighting service: Light fixtures, transformers, wire gauge, stakes, connectors, timers.

Each service type requires its own category structure and calculation methods, but reuses the same database architecture and UI components.

---

## Success Criteria

Materials database fully populated with at least 6 materials covering all paver patio categories. Calculation engine accurately calculates quantities using volume_depth, area_coverage, and linear_perimeter methods. Price per square foot reflects actual material costs not estimates.

Materials Tab UI matches quality and polish of existing Services Tab. Admin/owner have full CRUD access, regular users have read-only view. Role-based permissions enforced at database, storage, API, and UI layers.

Material images display correctly with automatic thumbnail generation. Images auto-delete when material removed. No orphaned files in storage.

Waste and compaction factors applied correctly in calculations. Default materials auto-selected on new quotes. RLS policies prevent unauthorized modifications at database level.

System ready for AI integration in Phase 3 with clean API for material selection and cost calculation.