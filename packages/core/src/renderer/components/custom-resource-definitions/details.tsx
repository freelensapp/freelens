/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./details.scss";

import { CustomResourceDefinition } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "../badge";
import { DrawerItem, DrawerTitle } from "../drawer";
import { Input } from "../input";
import { KubeObjectConditionsDrawer } from "../kube-object-conditions";
import { MonacoEditor } from "../monaco-editor";
import { Table, TableCell, TableHead, TableRow } from "../table";

import type { Logger } from "@freelensapp/logger";

import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface CustomResourceDefinitionDetailsProps extends KubeObjectDetailsProps<CustomResourceDefinition> {}

interface Dependencies {
  logger: Logger;
}

@observer
class NonInjectedCustomResourceDefinitionDetails extends React.Component<
  CustomResourceDefinitionDetailsProps & Dependencies
> {
  render() {
    const { object: crd } = this.props;

    if (!crd) {
      return null;
    }

    if (!(crd instanceof CustomResourceDefinition)) {
      this.props.logger.error(
        "[CustomResourceDefinitionDetails]: passed object that is not an instanceof CustomResourceDefinition",
        crd,
      );

      return null;
    }

    const { plural, singular, kind, listKind } = crd.getNames();
    const printerColumns = crd.getPrinterColumns();
    const validation = crd.getValidation();

    return (
      <div className="CustomResourceDefinitionDetails">
        <DrawerItem name="Group">{crd.getGroup()}</DrawerItem>
        <DrawerItem name="Version">{crd.getVersion()}</DrawerItem>
        <DrawerItem name="Stored versions">{crd.getStoredVersions()}</DrawerItem>
        <DrawerItem name="Scope">{crd.getScope()}</DrawerItem>
        <DrawerItem name="Resource">
          <Link to={crd.getResourceUrl()}>{crd.getResourceTitle()}</Link>
        </DrawerItem>
        <DrawerItem name="Conversion" className="flex gaps align-flex-start">
          <Input multiLine theme="round-black" className="box grow" value={crd.getConversion()} readOnly />
        </DrawerItem>
        <KubeObjectConditionsDrawer object={crd} />
        <DrawerTitle>Names</DrawerTitle>
        <Table selectable className="names box grow">
          <TableHead>
            <TableCell>plural</TableCell>
            <TableCell>singular</TableCell>
            <TableCell>kind</TableCell>
            <TableCell>listKind</TableCell>
          </TableHead>
          <TableRow>
            <TableCell>{plural}</TableCell>
            <TableCell>{singular}</TableCell>
            <TableCell>{kind}</TableCell>
            <TableCell>{listKind}</TableCell>
          </TableRow>
        </Table>
        {printerColumns.length > 0 && (
          <>
            <DrawerTitle>Additional Printer Columns</DrawerTitle>
            <Table selectable className="printer-columns box grow">
              <TableHead>
                <TableCell className="name">Name</TableCell>
                <TableCell className="type">Type</TableCell>
                <TableCell className="json-path">JSON Path</TableCell>
              </TableHead>
              {printerColumns.map((column, index) => {
                const { name, type, jsonPath } = column;

                return (
                  <TableRow key={index}>
                    <TableCell className="name">{name}</TableCell>
                    <TableCell className="type">{type}</TableCell>
                    <TableCell className="json-path">
                      <Badge label={jsonPath} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </Table>
          </>
        )}
        {validation && (
          <>
            <DrawerTitle>Validation</DrawerTitle>
            <MonacoEditor readOnly value={validation} style={{ height: 400 }} />
          </>
        )}
      </div>
    );
  }
}

export const CustomResourceDefinitionDetails = withInjectables<Dependencies, CustomResourceDefinitionDetailsProps>(
  NonInjectedCustomResourceDefinitionDetails,
  {
    getProps: (di, props) => ({
      ...props,
      logger: di.inject(loggerInjectionToken),
    }),
  },
);
