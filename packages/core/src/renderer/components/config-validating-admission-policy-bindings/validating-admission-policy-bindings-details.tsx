/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observer } from "mobx-react";
import React from "react";
import { DrawerItem, DrawerTitle } from "../drawer";

import type { ValidatingAdmissionPolicyBinding } from "@freelensapp/kube-object";

import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface ValidatingAdmissionPolicyBindingDetailsProps
  extends KubeObjectDetailsProps<ValidatingAdmissionPolicyBinding> {}

@observer
export class ValidatingAdmissionPolicyBindingDetails extends React.Component<ValidatingAdmissionPolicyBindingDetailsProps> {
  render() {
    const { object: binding } = this.props;

    const paramRef = binding.getParamRef();
    const matchResources = binding.getMatchResources();
    const validationActions = binding.getValidationActions();

    return (
      <div className="ValidatingAdmissionPolicyBindingDetails">
        <DrawerItem name="API version">{binding.apiVersion}</DrawerItem>
        <DrawerItem name="Policy Name">{binding.getPolicyName()}</DrawerItem>
        <DrawerItem name="Validation Actions">{validationActions.join(", ")}</DrawerItem>

        {paramRef && (
          <>
            <DrawerTitle>Param Ref</DrawerTitle>
            {paramRef.name && <DrawerItem name="Name">{paramRef.name}</DrawerItem>}
            {paramRef.namespace && <DrawerItem name="Namespace">{paramRef.namespace}</DrawerItem>}
            {paramRef.parameterNotFoundAction && (
              <DrawerItem name="Parameter Not Found Action">{paramRef.parameterNotFoundAction}</DrawerItem>
            )}
          </>
        )}

        {matchResources && (
          <>
            <DrawerTitle>Match Resources</DrawerTitle>
            {matchResources.matchPolicy && <DrawerItem name="Match Policy">{matchResources.matchPolicy}</DrawerItem>}
            <DrawerItem name="Resource Rules">
              {matchResources.resourceRules?.map((rule, index) => (
                <div key={index}>
                  <div>API Groups: {rule.apiGroups.join(", ")}</div>
                  <div>API Versions: {rule.apiVersions?.join(", ")}</div>
                  <div>Operations: {rule.operations.join(", ")}</div>
                  {rule.resources && <div>Resources: {rule.resources.join(", ")}</div>}
                  {rule.resourceNames && <div>Resource Names: {rule.resourceNames.join(", ")}</div>}
                  {rule.scope && <div>Scope: {rule.scope}</div>}
                </div>
              ))}
            </DrawerItem>
          </>
        )}
      </div>
    );
  }
}
