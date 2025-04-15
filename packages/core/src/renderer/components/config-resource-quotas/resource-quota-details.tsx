/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./resource-quota-details.scss";
import { ResourceQuota } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";
import { loggerInjectionToken } from "@freelensapp/logger";
import {
  cpuUnitsToNumber,
  cssNames,
  hasDefinedTupleValue,
  metricUnitsToNumber,
  object,
  unitsToBytes,
} from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import kebabCase from "lodash/kebabCase";
import { observer } from "mobx-react";
import React from "react";
import { DrawerItem, DrawerTitle } from "../drawer";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import { LineProgress } from "../line-progress";
import { Table, TableCell, TableHead, TableRow } from "../table";

export interface ResourceQuotaDetailsProps extends KubeObjectDetailsProps<ResourceQuota> {}

function transformUnit(name: string, value: string): number | undefined {
  if (name.includes("memory") || name.includes("storage")) {
    return unitsToBytes(value);
  }

  if (name.includes("cpu")) {
    return cpuUnitsToNumber(value);
  }

  return metricUnitsToNumber(value);
}

function renderQuotas(quota: ResourceQuota): JSX.Element[] {
  const { hard = {}, used = {} } = quota.status ?? {};

  return object
    .entries(hard)
    .filter(hasDefinedTupleValue)
    .map(([name, rawMax]) => {
      const rawCurrent = used[name] ?? "0";
      const current = transformUnit(name, rawCurrent);
      const max = transformUnit(name, rawMax);

      if (current === undefined || max === undefined) {
        return (
          <div key={name} className={cssNames("param", kebabCase(name))}>
            <span className="title">{name}</span>
            <span className="value">{`${rawCurrent} / ${rawMax}`}</span>
          </div>
        );
      }

      const usage =
        max === 0
          ? 100 // special case 0 max as always 100% usage
          : (current / max) * 100;

      return (
        <div key={name} className={cssNames("param", kebabCase(name))}>
          <span className="title">{name}</span>
          <span className="value">{`${rawCurrent} / ${rawMax}`}</span>
          <LineProgress max={max} value={current} tooltip={<p>{`Set: ${rawMax}. Usage: ${+usage.toFixed(2)}%`}</p>} />
        </div>
      );
    });
}

interface Dependencies {
  logger: Logger;
}

@observer
class NonInjectedResourceQuotaDetails extends React.Component<ResourceQuotaDetailsProps & Dependencies> {
  render() {
    const { object: quota } = this.props;

    if (!quota) {
      return null;
    }

    if (!(quota instanceof ResourceQuota)) {
      this.props.logger.error("[ResourceQuotaDetails]: passed object that is not an instanceof ResourceQuota", quota);

      return null;
    }

    return (
      <div className="ResourceQuotaDetails">
        <DrawerItem name="Quotas" className="quota-list">
          {renderQuotas(quota)}
        </DrawerItem>

        {quota.getScopeSelector().length > 0 && (
          <>
            <DrawerTitle>Scope Selector</DrawerTitle>
            <Table className="paths">
              <TableHead>
                <TableCell>Operator</TableCell>
                <TableCell>Scope name</TableCell>
                <TableCell>Values</TableCell>
              </TableHead>
              {quota.getScopeSelector().map((selector, index) => {
                const { operator, scopeName, values } = selector;

                return (
                  <TableRow key={index}>
                    <TableCell>{operator}</TableCell>
                    <TableCell>{scopeName}</TableCell>
                    <TableCell>{values.join(", ")}</TableCell>
                  </TableRow>
                );
              })}
            </Table>
          </>
        )}
      </div>
    );
  }
}

export const ResourceQuotaDetails = withInjectables<Dependencies, ResourceQuotaDetailsProps>(
  NonInjectedResourceQuotaDetails,
  {
    getProps: (di, props) => ({
      ...props,
      logger: di.inject(loggerInjectionToken),
    }),
  },
);
