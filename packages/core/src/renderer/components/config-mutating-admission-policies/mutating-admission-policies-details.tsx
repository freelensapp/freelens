/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observer } from "mobx-react";
import React from "react";
import { DrawerItem, DrawerTitle } from "../drawer";

import type { MutatingAdmissionPolicy } from "@freelensapp/kube-object";

import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface MutatingAdmissionPolicyDetailsProps extends KubeObjectDetailsProps<MutatingAdmissionPolicy> {}

@observer
export class MutatingAdmissionPolicyDetails extends React.Component<MutatingAdmissionPolicyDetailsProps> {
  render() {
    const { object: policy } = this.props;

    const paramKind = policy.getParamKind();
    const matchConstraints = policy.getMatchConstraints();
    const mutations = policy.getMutations();
    const matchConditions = policy.getMatchConditions();
    const variables = policy.getVariables();

    return (
      <div className="MutatingAdmissionPolicyDetails">
        <DrawerItem name="API version">{policy.apiVersion}</DrawerItem>
        <DrawerItem name="Failure Policy">{policy.getFailurePolicy()}</DrawerItem>
        <DrawerItem name="Reinvocation Policy">{policy.getReinvocationPolicy()}</DrawerItem>
        {paramKind && (
          <DrawerItem name="Param Kind">{[paramKind.apiVersion, paramKind.kind].filter(Boolean).join("/")}</DrawerItem>
        )}

        {matchConditions.length > 0 && (
          <>
            <DrawerTitle>Match Conditions</DrawerTitle>
            {matchConditions.map((matchCondition) => (
              <DrawerItem name={matchCondition.name} key={matchCondition.name}>
                {matchCondition.expression}
              </DrawerItem>
            ))}
          </>
        )}

        {variables.length > 0 && (
          <>
            <DrawerTitle>Variables</DrawerTitle>
            {variables.map((variable) => (
              <DrawerItem name={variable.name} key={variable.name}>
                {variable.expression}
              </DrawerItem>
            ))}
          </>
        )}

        <DrawerTitle>Mutations</DrawerTitle>
        {mutations.length === 0 && <div style={{ opacity: 0.6 }}>No mutations set</div>}
        {mutations.map((mutation, index) => (
          <div key={index}>
            <DrawerItem name="Patch Type">{mutation.patchType}</DrawerItem>
            {mutation.applyConfiguration?.expression && (
              <DrawerItem name="Expression">{mutation.applyConfiguration.expression}</DrawerItem>
            )}
            {mutation.jsonPatch?.expression && (
              <DrawerItem name="Expression">{mutation.jsonPatch.expression}</DrawerItem>
            )}
          </div>
        ))}

        {matchConstraints && (
          <>
            <DrawerTitle>Match Constraints</DrawerTitle>
            {matchConstraints.matchPolicy && (
              <DrawerItem name="Match Policy">{matchConstraints.matchPolicy}</DrawerItem>
            )}
            <DrawerItem name="Resource Rules">
              {matchConstraints.resourceRules?.map((rule, index) => (
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
