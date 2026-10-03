/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export function getTimestampedLogFilename(prefix: string): string {
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");

  return `${prefix}-${timestamp}.log`;
}
