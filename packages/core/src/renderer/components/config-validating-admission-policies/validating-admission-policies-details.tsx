/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observer } from "mobx-react";
import React from "react";
import { DrawerItem, DrawerTitle } from "../drawer";

import type { ValidatingAdmissionPolicy } from "@freelensapp/kube-object";

import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface ValidatingAdmissionPolicyDetailsProps extends KubeObjectDetailsProps<ValidatingAdmissionPolicy> {}

@observer
export class ValidatingAdmissionPolicyDetails extends React.Component<ValidatingAdmissionPolicyDetailsProps> {
  render() {
    const { object: policy } = this.props;

    const paramKind = policy.getParamKind();
    const matchConstraints = policy.getMatchConstraints();
    const validations = policy.getValidations();
    const matchConditions = policy.getMatchConditions();
    const variables = policy.getVariables();
    const auditAnnotations = policy.getAuditAnnotations();

    return (
      <div className="ValidatingAdmissionPolicyDetails">
        <DrawerItem name="API version">{policy.apiVersion}</DrawerItem>
        <DrawerItem name="Failure Policy">{policy.getFailurePolicy()}</DrawerItem>
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

        <DrawerTitle>Validations</DrawerTitle>
        {validations.length === 0 && <div style={{ opacity: 0.6 }}>No validations set</div>}
        {validations.map((validation, index) => (
          <div key={index}>
            <DrawerItem name="Expression">{validation.expression}</DrawerItem>
            {validation.message && <DrawerItem name="Message">{validation.message}</DrawerItem>}
            {validation.messageExpression && (
              <DrawerItem name="Message Expression">{validation.messageExpression}</DrawerItem>
            )}
            {validation.reason && <DrawerItem name="Reason">{validation.reason}</DrawerItem>}
          </div>
        ))}

        {auditAnnotations.length > 0 && (
          <>
            <DrawerTitle>Audit Annotations</DrawerTitle>
            {auditAnnotations.map((auditAnnotation) => (
              <DrawerItem name={auditAnnotation.key} key={auditAnnotation.key}>
                {auditAnnotation.valueExpression}
              </DrawerItem>
            ))}
          </>
        )}

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
