# TradeSphere Pricing Tool

We're building a multi-tenant SaaS pricing calculator for landscape and hardscape contractors. The platform enables salespeople to create accurate quotes through an AI-powered chat interface that dynamically prices complex services like paver patios, excavation, retaining walls, and custom landscape projects. Our goal is to deliver an extravagant UI/UX experience with seamless workflow from customer creation to quote generation, with real-time pricing based on materials, labor, and geographic market rates across America.

## Stack
- React + TypeScript + Vite
- Supabase (PostgreSQL)
- No localStorage (use React state)
- AI Chat: Claude/GPT API integration with multi-turn conversation memory
- Quote System: Context-aware AI agent with qualifying question workflow

## Critical Rules
- **Multi-tenancy**: ALL queries filter by company_id
- **RLS Policies**: Enforce data isolation at database level
- **Security-first**: Admin/owner permissions vs read-only users
- **No localStorage**: Use React state only (artifact environment limitation)
- **Mobile-First**: All UI changes must work on mobile browsers (320px-428px); deploy mobile-developer at end of todos
- **Service-Material Mapping**: Materials are service-specific (e.g., paver blocks only for paver patios)
- **Real-time Variables**: All pricing variables, percentages, and costs must update dynamically
- **Waste Factors**: Apply 10% waste for standard materials, 15-25% for complex cuts
- **Coverage Calculations**: Each material has unique coverage rates (volume, area, linear)
- **Compaction Factors**: Base materials shrink ~20% when compacted
- **Role-based UI**: Show/hide admin actions based on user.role and permissions

## Available Agents

### Quick Reference Table

| Agent | Model | Primary Use Case | Key Strength |
|-------|-------|------------------|--------------|
| **backend-architect** | Opus | API Design | Scalable microservices architecture |
| **security-auditor** | Opus | Security Reviews | OWASP compliance & DevSecOps |
| **database-optimizer** | Opus | Query Performance | Advanced indexing & caching |
| **test-automator** | Sonnet | Test Generation | AI-powered TDD automation |
| **frontend-developer** | Sonnet | React Components | Next.js 15 & React 19 expertise |
| **ui-ux-designer** | Sonnet | Interface Design | Accessibility-first design systems |
| **payment-integration** | Sonnet | Payment Processing | Dwolla ACH integration |
| **typescript-pro** | Sonnet | Type Safety | Advanced TypeScript patterns |
| **tdd-orchestrator** | Opus | TDD Workflows | Red-green-refactor discipline |
| **code-reviewer** | Opus | Code Quality | Security & performance analysis |
| **debugger** | Sonnet | Error Resolution | Root cause analysis |
| **error-detective** | Sonnet | Log Analysis | Pattern recognition & correlation |
| **prompt-engineer** | Opus | AI Integration | Chain-of-thought & constitutional AI |
| **mobile-developer** | Sonnet | PWA & Mobile | Mobile-first optimization & native prep |

**Full agent documentation**: See [docs/current/PRIORITY_AGENTS.md](docs/current/PRIORITY_AGENTS.md)

## Key Workflows
Use these for complex multi-agent tasks:
- **/workflows:feature-development**: Build complete features (e.g., materials management system)
- **/workflows:security-hardening**: Comprehensive security audit of authentication, RLS, permissions
- **/workflows:full-stack-feature**: Coordinate API → Database → Frontend → Testing
- **/workflows:performance-optimization**: Profile and optimize pricing calculations and queries

---

## 📱 Mobile-Developer Agent: Strategic Usage

### Current State: PWA (Progressive Web App)
TradeSphere is currently a **web application with PWA functionality**. It must work perfectly in mobile browsers (Safari, Chrome Mobile) with responsive design and touch-optimized interactions.

### Future State: Native Mobile Apps
The application will eventually be converted to full native apps for:
- **iOS App Store** (Swift/SwiftUI or React Native)
- **Google Play Store** (Kotlin or React Native)

### 🎯 Mobile-Developer Role & Boundaries

**✅ WHAT MOBILE-DEVELOPER SHOULD DO:**

1. **Documentation & Tracking (Primary Role)**
   - Document code patterns that will need changes for native app migration
   - Add inline comments using standardized format:
     ```typescript
     // TODO: [NATIVE-APP] This uses web-specific localStorage API
     // For iOS/Android: Replace with AsyncStorage (React Native) or platform-specific storage
     // See: docs/pre-production-map/MOBILE-DEV-TRACKING.md
     ```
   - Log all findings in `docs/pre-production-map/MOBILE-DEV-TRACKING.md`
   - Create migration roadmap sections for future native app development

2. **PWA Optimization (Active Work with UI/UX Designer)**
   - Work **side-by-side with ui-ux-designer** to ensure mobile-responsive design
   - Optimize touch targets (minimum 44x44px for iOS, 48x48dp for Android)
   - Verify responsive layouts work on phone viewports (320px - 428px wide)
   - Test PWA features: offline mode, install prompts, service workers
   - Ensure all interactions feel native on mobile browsers

3. **Mobile-First Code Reviews**
   - Review new features for mobile compatibility
   - Flag web-specific APIs that won't work in native apps
   - Suggest mobile-friendly alternatives that work in both PWA and future native contexts

**❌ WHAT MOBILE-DEVELOPER SHOULD NOT DO:**

1. **DO NOT make breaking changes to current PWA setup**
   - Don't replace working web APIs with native-only solutions
   - Don't introduce React Native code into the current codebase
   - Don't restructure the app for native deployment prematurely

2. **DO NOT create parallel native app implementations**
   - Current focus is PWA stability and mobile browser optimization
   - Native app conversion is a future Phase (post-launch)

3. **DO NOT override UI/UX decisions**
   - Mobile-developer supports ui-ux-designer, not replaces
   - Design decisions come from ui-ux-designer first
   - Mobile-developer ensures technical feasibility on mobile platforms

### 🔄 Recommended Workflow

**When making ANY code changes, include mobile-developer at END of todo list:**

```markdown
**Todo List Example:**
1. ✅ Implement new BillingTab component (frontend-developer)
2. ✅ Add responsive styling (ui-ux-designer)
3. 🔄 Review for mobile compatibility (mobile-developer)
   - Check touch targets and mobile layout
   - Document any native-app migration notes
   - Update MOBILE-DEV-TRACKING.md
```

### 📋 Mobile-Developer Deliverables

For EVERY feature deployment, mobile-developer provides:

1. **Inline Code Comments**: Tagged with `[NATIVE-APP]` for future migration points
2. **MOBILE-DEV-TRACKING.md Updates**: Categorized by feature area:
   - Web APIs that need replacement (localStorage → AsyncStorage)
   - PWA features that need native equivalents (service workers → background tasks)
   - UI patterns that need platform-specific implementations
   - Third-party libraries incompatible with React Native
3. **Mobile UX Approval**: Confirmation that feature works well on mobile browsers
4. **Future Pivot Points**: Clear documentation of what changes when migrating to native

### 📍 Mobile Tracking Document

**Location**: `docs/pre-production-map/MOBILE-DEV-TRACKING.md`

**Structure**:
```markdown
# Mobile Development Tracking

## Current PWA Status
- ✅ Service workers configured
- ✅ Responsive design for 320px-428px viewports
- ⚠️ Touch targets need review in MaterialsTab

## Native App Migration Notes

### Phase 1: Core Infrastructure
- [ ] Replace localStorage with AsyncStorage
- [ ] Replace fetch() with axios (better native compatibility)
- [ ] Replace window.location with React Navigation

### Phase 2: Feature-Specific Changes
#### Customer Management
- [ ] File upload: Use react-native-image-picker
- [ ] Geolocation: Use @react-native-community/geolocation
...
```

### 🎨 Collaboration with UI/UX Designer

Mobile-developer and ui-ux-designer work as a **paired team** for mobile optimization:

1. **UI/UX Designer** leads:
   - Visual design decisions
   - Layout and spacing
   - User interaction flows
   - Accessibility requirements

2. **Mobile-Developer** supports:
   - Technical feasibility on mobile platforms
   - Performance implications of design choices
   - Platform-specific patterns (iOS vs Android vs PWA)
   - Touch interaction optimization

**Example Collaboration**:
```
ui-ux-designer: "Let's use a bottom sheet for filters on mobile"
mobile-developer: "✅ Great for PWA (can use CSS). For native apps, we'll need
                   @gorhom/bottom-sheet (React Native). I'll document this
                   in MOBILE-DEV-TRACKING.md"
```

---

## AI Chat System Architecture

### Conversational Quote Generation
The core of TradeSphere is an AI-powered chat interface where salespeople create quotes through natural conversation. The AI must maintain context across multiple turns to gather all necessary information before calculating final pricing.

### Multi-Turn Conversation Flow
1. **Initial Request**: User describes what customer wants (e.g., "15x20 paver patio with fire pit")
2. **Qualifying Questions**: AI asks series of questions to gather:
   - Exact dimensions and square footage
   - Material preferences (paver style, colors, patterns)
   - Site conditions (slope, excavation needs, access)
   - Additional features (edging, lighting, drainage)
   - Customer budget range and timeline
3. **Iterative Refinement**: AI clarifies ambiguities, suggests options, validates inputs
4. **Variable Collection**: AI dynamically tags and organizes variables from conversation
5. **Calculation Preparation**: Once all parameters gathered, AI prepares final calculation
6. **Quote Presentation**: AI presents itemized quote with breakdown for sales review
7. **Sales Review**: User can modify, add notes, adjust pricing before finalizing

### Memory & Context Requirements
- **Conversation History**: Full chat transcript stored per customer session
- **Variable State**: Dynamic tracking of gathered parameters (square footage, materials, etc.)
- **Service Dependencies**: AI must understand flagged services (e.g., excavation auto-calculated for paver patio)
- **Customer Profile**: Past quotes, preferences, and project history for returning customers
- **Progressive Disclosure**: AI reveals pricing incrementally as variables are confirmed

### Prompt Engineering Responsibilities
Use **prompt-engineer** agent to:
- **Optimize Question Sequences**: Design efficient qualifying question flows that gather all needed info without overwhelming user
- **Context Management**: Structure prompts to maintain relevant context across 10-20 message conversations
- **Response Formatting**: Engineer prompts for consistent quote presentation with interactive elements (dropdowns, tags)
- **Variable Extraction**: Design prompts that reliably extract structured data from natural language
- **Personality Tuning**: Configure AI sales personality (helpful, consultative, not pushy) per company settings
- **Error Handling**: Prompt for graceful handling of incomplete info or calculation errors
- **API Integration**: Structure Claude/GPT API calls for optimal token usage and response quality

### Technical Implementation
- **API**: Claude Sonnet 4.5 or GPT-4 for chat intelligence
- **Storage**: Supabase tables for chat history, customer sessions, quote states
- **State Management**: React context for active conversation state
- **Message Streaming**: Real-time AI responses with typing indicators
- **Memory System**: Conversation memory MCP for persistent context across sessions

## MCPs Configured
- **sequential-thinking**: Advanced reasoning and problem decomposition
- **memory**: Persistent context and information recall across sessions
- **filesystem**: File system access and manipulation
- **puppeteer-stealth**: Browser automation for testing and screenshots
- **postgresql**: Supabase database connection (project-specific)