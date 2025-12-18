# Usage Guide: CRD Groups Configuration in Freelens

## Introduction

The CRD groups feature in Freelens allows you to organize your Custom Resource Definitions (CRDs) into custom groups for easier navigation. This new implementation offers a flexible structure and several advanced features.

## Supported Formats

You can configure your groups using one of the following formats:

- **YAML**: Recommended format, more readable and easy to edit

You can switch between these formats using the selector located in the top right corner of the interface.

## Main Features

1. **Two-level structure**: Organize your CRDs in groups and subgroups
2. **Hide entries**: Use `null` to hide certain CRDs
3. **Catch-all patterns**: Use empty strings `""` to capture all remaining CRDs
4. **Substring matching**: A pattern matches if the CRD name contains this pattern

## Configuration Structure

### Basic Structure

```yaml
TopLevelGroup1:
  - pattern1
  - pattern2
TopLevelGroup2:
  - pattern3
  - SubgroupA:
    - patternA
  - SubgroupB:
    - patternB
```

## Advanced Features

### Hiding Entries

If you want to hide certain CRDs, you can set the group or subgroup value to `null`:

```yaml
HiddenGroup: null
VisibleGroup:
  SubgroupA: null  # This subgroup will be hidden
  SubgroupB:       # This subgroup will be visible
    - pattern
```

### Catch-all Patterns

To capture all CRDs that don't match a specific pattern, use an empty string:

```yaml
MainGroup:
  - specific.pattern
  - ""  # Will match any CRD not matched by other patterns
```

### Pattern Specificity

When multiple patterns could match a CRD, the most specific pattern is chosen:

- Patterns with more dots (`.`) are considered more specific
- For example, `foo.bar.com` is more specific than `foo.bar`
- If multiple patterns have the same specificity, the first one is used

## Examples

### Example 1: Basic Organization

```yaml
Kubernetes:
  - k8s.io
AWS:
  - aws.amazon.com
Azure:
  - azure.com
```

### Example 2: With Subgroups

```yaml
Cluster Management:
  - Cluster API:
    - Addons:
      - addons.cluster.x-k8s.io
    - Cluster:
      - cluster.x-k8s.io
      - clusterctl.cluster.x-k8s.io
    - IPAM:
      - ipam.cluster.x-k8s.io
    - Runtime:
      - runtime.cluster.x-k8s.io
  - CSI Secrets Store:
    - secrets-store.csi.x-k8s.io
```

### Example 3: Advanced Structure with All Features

```yaml
Monitoring & Observability:
  Victoria Metrics:
    - operator.victoriametrics.com
    - monitoring.coreos.com
  Grafana:
    - monitoring.grafana.com
  OpenTelemetry:
    - opentelemetry.io

Cloud:
  AWS:
    - aws.amazon.com
    - amazonaws.com
  Azure:
    - azure.com
    - microsoft.com
  GCP:
    - cloud.google.com

Ignored: null  # These CRDs will be hidden

Misc:
  - ""  # Catch-all for anything not matched above
```

## Best Practices

1. Start with the default configuration and modify it as needed
2. Put more specific patterns first
3. Use descriptive group names
4. Use the YAML format for better readability
5. Test your configuration to ensure CRDs are organized as expected

## Troubleshooting

If your CRDs are not appearing where expected, check:

1. That your patterns match the CRD group string
2. That you don't have conflicting patterns
3. That no group or parent group is set to `null`
4. That your YAML syntax is valid
