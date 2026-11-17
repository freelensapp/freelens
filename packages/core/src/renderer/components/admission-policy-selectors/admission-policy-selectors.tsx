/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observer } from "mobx-react";
import { Badge } from "../badge";
import { DrawerItem } from "../drawer";

import type { LabelMatchExpression, LabelSelector, MatchResources } from "@freelensapp/kube-object";

function formatExpression(expression: LabelMatchExpression): string {
  switch (expression.operator) {
    case "In":
      return `${expression.key} in (${expression.values.join(", ")})`;
    case "NotIn":
      return `${expression.key} notin (${expression.values.join(", ")})`;
    case "Exists":
      return expression.key;
    case "DoesNotExist":
      return `!${expression.key}`;
  }
}

const Selector = observer(function Selector({ name, selector }: { name: string; selector: LabelSelector | undefined }) {
  if (!selector) {
    return null;
  }

  const requirements = [
    ...Object.entries(selector.matchLabels ?? {}).map(([key, value]) => `${key}=${value ?? ""}`),
    ...(selector.matchExpressions ?? []).map(formatExpression),
  ];

  return (
    <DrawerItem name={name}>
      {requirements.length === 0 ? (
        "All"
      ) : (
        <div className="flex flex-wrap gap-2">
          {requirements.map((requirement, index) => (
            <Badge key={index} label={requirement} />
          ))}
        </div>
      )}
    </DrawerItem>
  );
});

export function AdmissionPolicySelectors({
  namespaceSelector,
  objectSelector,
}: Pick<MatchResources, "namespaceSelector" | "objectSelector">) {
  return (
    <>
      <Selector name="Namespace Selector" selector={namespaceSelector} />
      <Selector name="Object Selector" selector={objectSelector} />
    </>
  );
}
