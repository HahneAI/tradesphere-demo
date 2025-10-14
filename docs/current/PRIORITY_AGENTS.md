# Priority Agents Reference

This document provides quick access to the most frequently used agents for your development workflows. Each agent is listed with its purpose, key capabilities, and direct file path.

---

## 1. Backend Architect

**File**: [`agents/backend-architect.md`](agents/backend-architect.md)
**Model**: Opus
**Use Case**: API design, multi-tenant architecture, pricing engine logic

### What It Does
Expert backend architect specializing in scalable API design, microservices architecture, and distributed systems. Masters REST/GraphQL/gRPC APIs, event-driven architectures, service mesh patterns, and modern backend frameworks.

### Key Capabilities
- **API Design**: RESTful APIs, GraphQL, gRPC, WebSocket, versioning strategies
- **Microservices**: Service boundaries, communication patterns, service discovery, API Gateway
- **Event-Driven**: Message queues, Kafka, event sourcing, pub/sub patterns
- **Security**: OAuth 2.0, JWT, RBAC, ABAC, rate limiting, input validation
- **Resilience**: Circuit breaker, retry patterns, timeout management, graceful degradation
- **Observability**: Structured logging, metrics, distributed tracing, APM integration

### When to Use
- Designing new backend services or APIs from scratch
- Planning microservices architecture and service boundaries
- Implementing authentication/authorization systems
- Creating event-driven architectures
- Building resilient, observable backend systems

---

## 2. Security Auditor

**File**: [`agents/security-auditor.md`](agents/security-auditor.md)
**Model**: Opus
**Use Case**: Security reviews, RLS policy validation, permission enforcement

### What It Does
Expert security auditor specializing in DevSecOps, comprehensive cybersecurity, and compliance frameworks. Masters vulnerability assessment, threat modeling, secure authentication (OAuth2/OIDC), OWASP standards, cloud security, and security automation.

### Key Capabilities
- **DevSecOps**: SAST, DAST, IAST, dependency scanning in CI/CD pipelines
- **Authentication**: OAuth 2.0/2.1, OpenID Connect, SAML, WebAuthn, zero-trust architecture
- **OWASP**: Top 10 vulnerabilities, ASVS, SAMM, threat modeling (STRIDE, PASTA)
- **Testing**: Static analysis (SonarQube, CodeQL), dynamic analysis (OWASP ZAP, Burp Suite)
- **Cloud Security**: AWS Security Hub, Azure Security Center, GCP Security Command Center
- **Compliance**: GDPR, HIPAA, PCI-DSS, SOC 2, ISO 27001, NIST Cybersecurity Framework

### When to Use
- Conducting comprehensive security audits
- Implementing authentication and authorization systems
- Validating Row-Level Security (RLS) policies
- Setting up DevSecOps pipelines
- Ensuring compliance with regulatory frameworks
- Reviewing security-critical code changes

---

## 3. Database Optimizer

**File**: [`agents/database-optimizer.md`](agents/database-optimizer.md)
**Model**: Opus
**Use Case**: Query performance, indexing, multi-tenant data isolation

### What It Does
Expert database optimizer specializing in modern performance tuning, query optimization, and scalable architectures. Masters advanced indexing, N+1 resolution, multi-tier caching, partitioning strategies, and cloud database optimization.

### Key Capabilities
- **Query Optimization**: Execution plan analysis, query rewriting, complex query patterns
- **Advanced Indexing**: B-tree, Hash, GiST, GIN, BRIN, covering indexes, composite indexes
- **Performance Monitoring**: pg_stat_statements, Performance Schema, real-time monitoring
- **N+1 Resolution**: ORM optimization, eager loading, batch queries, DataLoader patterns
- **Caching**: Multi-tier caching (L1/L2/L3), Redis Cluster, cache invalidation strategies
- **Scaling**: Horizontal partitioning, sharding, read replicas, write optimization

### When to Use
- Optimizing slow queries and database performance
- Designing indexing strategies for high-traffic applications
- Eliminating N+1 query problems in ORMs
- Implementing multi-tier caching architectures
- Planning database sharding and scaling strategies
- Ensuring multi-tenant data isolation and performance

---

## 4. Test Automator

**File**: [`agents/test-automator.md`](agents/test-automator.md)
**Model**: Sonnet
**Use Case**: Test generation for pricing calculations and RLS policies

### What It Does
Master AI-powered test automation with modern frameworks, self-healing tests, and comprehensive quality engineering. Build scalable testing strategies with advanced CI/CD integration.

### Key Capabilities
- **TDD Excellence**: Red-green-refactor cycle automation, Chicago School & London School TDD
- **AI-Powered Testing**: Self-healing test automation, AI-driven test generation, visual AI testing
- **Modern Frameworks**: Playwright, Selenium, Appium, Postman, K6, Pact
- **CI/CD Integration**: Parallel execution, dynamic test selection, containerized environments
- **Performance Testing**: Load testing, stress testing, API performance, SLA validation
- **Quality Engineering**: Test pyramid, risk-based testing, shift-left practices

### When to Use
- Generating comprehensive test suites for new features
- Testing pricing calculations and business logic
- Validating RLS policies and multi-tenant isolation
- Setting up test automation frameworks
- Implementing TDD workflows
- Creating performance and load tests

---

## 5. Frontend Developer

**File**: [`agents/frontend-developer.md`](agents/frontend-developer.md)
**Model**: Sonnet
**Use Case**: React components, TypeScript implementation, state management

### What It Does
Build React components, implement responsive layouts, and handle client-side state management. Masters React 19, Next.js 15, and modern frontend architecture. Optimizes performance and ensures accessibility.

### Key Capabilities
- **React 19**: Server Components, Actions, async transitions, concurrent rendering
- **Next.js 15**: App Router, Server Actions, streaming patterns, Edge runtime
- **State Management**: Zustand, Jotai, React Query, SWR, Context API optimization
- **Styling**: Tailwind CSS, CSS-in-JS, design systems, responsive design
- **Performance**: Core Web Vitals, code splitting, image optimization, lazy loading
- **Testing**: React Testing Library, Jest, Playwright, Storybook, visual regression

### When to Use
- Building React components and user interfaces
- Implementing TypeScript-based frontend applications
- Creating responsive layouts and design systems
- Optimizing frontend performance and Core Web Vitals
- Setting up state management and data fetching
- Ensuring accessibility compliance

---

## 6. UI/UX Designer

**File**: [`agents/ui-ux-designer.md`](agents/ui-ux-designer.md)
**Model**: Sonnet
**Use Case**: Interface design, wireframes, extravagant user experience

### What It Does
Create interface designs, wireframes, and design systems. Masters user research, accessibility standards, and modern design tools. Specializes in design tokens, component libraries, and inclusive design.

### Key Capabilities
- **Design Systems**: Atomic design, design tokens, component libraries, multi-brand architecture
- **Modern Tools**: Figma advanced features (Auto Layout, Variants, Variables), Storybook integration
- **User Research**: Qualitative/quantitative research, usability testing, journey mapping, personas
- **Accessibility**: WCAG 2.1/2.2 compliance, inclusive design, screen reader optimization
- **Information Architecture**: Site mapping, navigation hierarchy, content strategy
- **Visual Design**: Typography systems, color theory, layout principles, iconography

### When to Use
- Designing user interfaces and experiences
- Creating design systems and component libraries
- Conducting user research and usability testing
- Ensuring accessibility and inclusive design
- Building wireframes and prototypes
- Establishing brand identity and visual consistency

---

## 7. Payment Integration

**File**: [`agents/payment-integration.md`](agents/payment-integration.md)
**Model**: Sonnet
**Use Case**: Payment gateway integration, company creation flow

### What It Does
Integrate Stripe, PayPal, and payment processors. Handles checkout flows, subscriptions, webhooks, and PCI compliance.

### Key Capabilities
- **Payment Processors**: Stripe, PayPal, Square API integration
- **Checkout Flows**: Payment forms, one-click checkout, saved payment methods
- **Subscriptions**: Recurring billing, plan management, prorated upgrades/downgrades
- **Webhooks**: Event handling, retry logic, idempotency
- **Security**: PCI compliance, tokenization, secure data handling
- **Error Handling**: Failed payments, disputes, refunds, retry strategies

### When to Use
- Integrating payment gateways (Stripe, PayPal, Square)
- Building checkout and payment flows
- Implementing subscription billing systems
- Setting up webhook handlers for payment events
- Ensuring PCI compliance and payment security
- Handling payment errors and edge cases

---

## 8. TypeScript Pro

**File**: [`agents/typescript-pro.md`](agents/typescript-pro.md)
**Model**: Sonnet
**Use Case**: Type-safe code, pricing calculation functions, validation logic

### What It Does
Master TypeScript with advanced types, generics, and strict type safety. Handles complex type systems, decorators, and enterprise-grade patterns.

### Key Capabilities
- **Advanced Types**: Generics, conditional types, mapped types, template literal types
- **Strict Configuration**: Compiler options, type checking, error prevention
- **Type Inference**: Utility types, type guards, discriminated unions
- **Decorators**: Metadata programming, class decorators, method decorators
- **Module Systems**: ES modules, namespace organization, declaration files
- **Framework Integration**: React, Node.js, Express type-safe patterns

### When to Use
- Writing type-safe TypeScript code
- Creating complex pricing calculation functions
- Building validation logic with type guarantees
- Designing advanced type systems and generics
- Optimizing TypeScript configuration
- Creating type declaration files for libraries

---

## 9. TDD Orchestrator

**File**: [`agents/tdd-orchestrator.md`](agents/tdd-orchestrator.md)
**Model**: Opus
**Use Case**: Test-driven development workflows, test-first approach

### What It Does
Master TDD orchestrator specializing in red-green-refactor discipline, multi-agent workflow coordination, and comprehensive test-driven development practices. Enforces TDD best practices across teams with AI-assisted testing.

### Key Capabilities
- **TDD Discipline**: Red-green-refactor cycle enforcement, test-first verification
- **Multi-Agent Coordination**: Specialized testing agent orchestration, parallel test development
- **Modern TDD**: Chicago School (state-based), London School (mockist), ATDD, BDD
- **AI-Assisted Testing**: Intelligent test generation, test data creation, predictive failure analysis
- **Test Architecture**: Test pyramid optimization, test categorization, isolation verification
- **Metrics**: Cycle time tracking, coverage analysis, quality assessment through mutation testing

### When to Use
- Implementing test-driven development workflows
- Coordinating multiple testing agents
- Establishing TDD discipline across teams
- Generating AI-assisted tests
- Tracking TDD metrics and compliance
- Refactoring legacy code with test safety nets

---

## 10. Code Reviewer

**File**: [`agents/code-reviewer.md`](agents/code-reviewer.md)
**Model**: Opus
**Use Case**: Security-focused code reviews, best practices analysis

### What It Does
Elite code review expert specializing in modern AI-powered code analysis, security vulnerabilities, performance optimization, and production reliability. Masters static analysis tools, security scanning, and configuration review.

### Key Capabilities
- **AI-Powered Analysis**: Integration with modern AI review tools (GitHub Copilot, Codiga)
- **Static Analysis**: SonarQube, CodeQL, Semgrep, security-focused scanning
- **Security Review**: OWASP Top 10, input validation, authentication/authorization
- **Performance Analysis**: Database query optimization, N+1 detection, memory leak analysis
- **Configuration Review**: Production configs, database settings, infrastructure as code
- **Modern Practices**: TDD compliance, BDD scenarios, contract testing, feature flags

### When to Use
- Conducting comprehensive code reviews
- Analyzing security vulnerabilities
- Reviewing performance implications
- Validating configuration changes
- Ensuring production reliability
- Enforcing coding standards and best practices

---

## 11. Debugger

**File**: [`agents/debugger.md`](agents/debugger.md)
**Model**: Sonnet
**Use Case**: Error resolution and root cause analysis

### What It Does
Debugging specialist for errors, test failures, and unexpected behavior. Focuses on root cause analysis and minimal fixes.

### Key Capabilities
- **Error Analysis**: Stack trace interpretation, error message analysis
- **Root Cause**: Hypothesis formation and testing, isolation techniques
- **Strategic Logging**: Debug logging placement, variable state inspection
- **Fix Implementation**: Minimal code fixes, symptom vs. cause distinction
- **Verification**: Solution testing, regression prevention
- **Documentation**: Root cause explanation, prevention recommendations

### When to Use
- Debugging errors and test failures
- Analyzing stack traces and error messages
- Finding root causes of unexpected behavior
- Implementing fixes for production issues
- Verifying solutions and preventing regressions

---

## 12. Error Detective

**File**: [`agents/error-detective.md`](agents/error-detective.md)
**Model**: Sonnet
**Use Case**: Stack trace investigation and bug hunting

### What It Does
Search logs and codebases for error patterns, stack traces, and anomalies. Correlates errors across systems and identifies root causes.

### Key Capabilities
- **Log Analysis**: Parsing, regex patterns, error extraction across log formats
- **Pattern Recognition**: Error correlation, time-based analysis, deployment correlation
- **Distributed Systems**: Cross-service error correlation, cascading failure detection
- **Anomaly Detection**: Error rate changes, spike detection, baseline comparison
- **Query Building**: Elasticsearch, Splunk, log aggregation queries
- **Monitoring**: Prevention strategies, recurrence detection queries

### When to Use
- Investigating production errors and failures
- Analyzing logs across distributed systems
- Detecting error patterns and anomalies
- Correlating errors with deployments
- Building monitoring queries for error detection
- Hunting bugs across multiple services

---

## 13. Prompt Engineer

**File**: [`agents/prompt-engineer.md`](agents/prompt-engineer.md)
**Model**: Opus
**Use Case**: AI prompt optimization, Claude/GPT API integration, agent configuration

### What It Does
Expert prompt engineer specializing in advanced prompting techniques, LLM optimization, and AI system design. Masters chain-of-thought, constitutional AI, and production prompt strategies.

### Key Capabilities
- **Advanced Techniques**: Chain-of-thought, constitutional AI, meta-prompting, self-improvement
- **Model Optimization**: OpenAI GPT-4o, Anthropic Claude, Llama, model-specific tuning
- **Production Systems**: Prompt templates, dynamic templating, version control, A/B testing
- **RAG Integration**: Retrieval-augmented generation, context compression, hallucination reduction
- **Agent Prompting**: Multi-agent systems, role definition, tool selection, collaboration protocols
- **Evaluation**: Performance metrics, testing methodologies, safety assessment

### When to Use
- Building AI features and LLM integrations
- Optimizing prompts for Claude or GPT APIs
- Configuring agent systems and workflows
- Creating chain-of-thought reasoning systems
- Implementing constitutional AI patterns
- Designing multi-agent collaboration systems

---

## 14. Mobile Developer

**File**: [`agents/mobile-developer.md`](agents/mobile-developer.md)
**Model**: Sonnet
**Use Case**: PWA optimization, mobile-responsive implementation, app store preparation

### What It Does
Expert mobile developer specializing in cross-platform development, PWA optimization, and mobile-first design. Masters React Native, Flutter, and native iOS/Android development with modern architecture patterns.

### Key Capabilities
- **PWA Excellence**: Service workers, offline functionality, install prompts, responsive design
- **Mobile Optimization**: Touch interfaces, performance on mobile networks, battery efficiency
- **Cross-Platform**: React Native, Flutter, Ionic with Capacitor for web-to-mobile transitions
- **Responsive Design**: Mobile-first layouts, touch targets, viewport optimization, gesture handling
- **Performance**: Startup time optimization, lazy loading, image optimization, code splitting
- **Testing**: Mobile device testing, responsive testing, performance profiling on mobile

### When to Use
- Optimizing Tradesphere web app for mobile browsers
- Implementing PWA features (offline mode, install prompts, push notifications)
- Ensuring responsive design works smoothly on all mobile devices
- Testing mobile performance and user experience
- Preparing codebase for future iOS/Android app store deployment
- Creating documentation for future native app conversion

### ⚠️ Tradesphere Context

**Current State**: Tradesphere is a web application with PWA functionality. Focus on ensuring all operations work smoothly on mobile browsers.

**Future State**: Will be adapted to full native apps for iOS App Store and Google Play Store.

**Agent Behavior**:
- **Implement mobile-optimized code** for current PWA functionality
- **Add code comments** when encountering code that will need iOS/Play Store specific adaptations
- **Create standalone documentation** noting future pivot points for native app conversion
- **Work with ui-ux-designer** for mobile-responsive design implementation
- **Tag technical debt** related to web-specific patterns that won't work in native apps

**Documentation Format**:
```
// TODO: [NATIVE-APP] This implementation uses web-specific APIs
// For iOS/Android: Replace with platform-specific alternative
// See: docs/native-app-migration.md
```

---

## Quick Reference Table

| Agent | Model | Primary Use Case | Key Strength |
|-------|-------|------------------|--------------|
| **backend-architect** | Opus | API Design | Scalable microservices architecture |
| **security-auditor** | Opus | Security Reviews | OWASP compliance & DevSecOps |
| **database-optimizer** | Opus | Query Performance | Advanced indexing & caching |
| **test-automator** | Sonnet | Test Generation | AI-powered TDD automation |
| **frontend-developer** | Sonnet | React Components | Next.js 15 & React 19 expertise |
| **ui-ux-designer** | Sonnet | Interface Design | Accessibility-first design systems |
| **payment-integration** | Sonnet | Payment Processing | Stripe/PayPal integration |
| **typescript-pro** | Sonnet | Type Safety | Advanced TypeScript patterns |
| **tdd-orchestrator** | Opus | TDD Workflows | Red-green-refactor discipline |
| **code-reviewer** | Opus | Code Quality | Security & performance analysis |
| **debugger** | Sonnet | Error Resolution | Root cause analysis |
| **error-detective** | Sonnet | Log Analysis | Pattern recognition & correlation |
| **prompt-engineer** | Opus | AI Integration | Chain-of-thought & constitutional AI |
| **mobile-developer** | Sonnet | PWA & Mobile | Mobile-first optimization & native prep |

---

## Usage Tips

1. **Use PROACTIVELY**: These agents are designed to be invoked before issues arise
2. **Combine Agents**: Multiple agents can work together (e.g., backend-architect + security-auditor)
3. **Respect Agent Boundaries**: Each agent defers to others for specialized work
4. **Model Selection**: Opus for complex architecture/strategy, Sonnet for implementation
5. **File Paths**: All agents live in `agents/` directory with `.md` extension

---

## See Also

- [CLAUDE.md](CLAUDE.md) - Safety guide and configuration instructions
- [agents/README.md](agents/README.md) - Complete agent documentation
- [tools/](tools/) - Reusable tool definitions
- [workflows/](workflows/) - Multi-step workflow orchestrations
