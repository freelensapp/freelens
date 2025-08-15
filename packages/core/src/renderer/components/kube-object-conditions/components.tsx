import { cssNames } from "@freelensapp/utilities";
import yaml from "js-yaml";
import { upperFirst } from "lodash/fp";
import moment from "moment-timezone";
import React from "react";
import { defaultYamlDumpOptions } from "../../../common/kube-helpers";
import { DurationAbsoluteTimestamp } from "../events";

import type { Condition } from "@freelensapp/kube-object";

export function getTooltip(condition: Condition, id: string) {
  return (
    <>
      {Object.entries(condition)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, value]) => {
          if (value === undefined) return null;
          if (value === null) return null;
          if (typeof value === "string") {
            const m = moment(value, moment.ISO_8601, true);
            if (m.isValid()) {
              value = <DurationAbsoluteTimestamp timestamp={value} />;
            }
          } else {
            value = yaml.dump(value, defaultYamlDumpOptions);
          }
          return (
            <div key={key} className="flex gaps align-center">
              <div className="name">{upperFirst(key)}</div>
              <div className="value">{value}</div>
            </div>
          );
        })}
    </>
  );
}

export function getClassName(condition: Condition, ...additionalClasses: string[]) {
  if (condition.status === "False") {
    return cssNames("False", ...additionalClasses);
  }
  return cssNames(condition.type, condition.reason, ...additionalClasses);
}
