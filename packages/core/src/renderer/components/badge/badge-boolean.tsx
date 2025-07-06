import React from "react";
import { Badge } from "./badge";
import styles from "./badge-boolean.module.scss";

export interface BadgeBooleanProps {
  value?: boolean;
}

export function getBooleanText(value?: boolean) {
  if (value === true) return "True";
  if (value === false) return "False";
  return "-";
}

export function getBooleanClass(value?: boolean) {
  if (value === true) return styles.true;
  if (value === false) return styles.false;
  return styles.undefined;
}

export function BadgeBoolean({ value }: BadgeBooleanProps) {
  return <Badge className={getBooleanClass(value)} label={getBooleanText(value)} />;
}
