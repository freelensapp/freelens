/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * This file is intentionally minimal for the MVP.
 * 
 * Originally planned to use kubeObjectListLayoutColumnInjectionToken for dynamic columns,
 * but the DI system doesn't support reactivity well (di.injectMany() is called once).
 * 
 * Instead, we're directly modifying the Nodes table component to read from storage
 * and dynamically generate columns. This is simpler and more straightforward for testing.
 * 
 * Once the approach is validated with Nodes, we can expand to other resource types
 * by either:
 * 1. Modifying each resource table component similarly
 * 2. Creating a higher-order component that wraps KubeObjectListLayout
 * 3. Solving the reactivity challenge and using the injection token system
 */

// Export a placeholder to satisfy the DI registration system
export default null as any;
