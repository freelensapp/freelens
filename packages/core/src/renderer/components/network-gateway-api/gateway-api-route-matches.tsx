/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";

import type { GRPCRouteMatch, HTTPRouteMatch } from "@freelensapp/kube-object";

export const renderHttpRouteMatches = (matches: HTTPRouteMatch[]) => (
  <ul>
    {matches.map((match, matchIndex) => (
      <li key={matchIndex}>
        {match.path && `Path: ${match.path.type ?? "PathPrefix"} ${match.path.value ?? "/"}`}
        {match.method && ` Method: ${match.method}`}
        {match.headers && match.headers.length > 0 && ` Headers: ${match.headers.map((h) => h.name).join(", ")}`}
      </li>
    ))}
  </ul>
);

export const renderGrpcRouteMatches = (matches: GRPCRouteMatch[]) => (
  <ul>
    {matches.map((match, matchIndex) => (
      <li key={matchIndex}>
        {match.method && (
          <>
            Service: {match.method.service ?? "*"}, Method: {match.method.method ?? "*"}
            {match.method.type && ` (${match.method.type})`}
          </>
        )}
        {match.headers && match.headers.length > 0 && ` Headers: ${match.headers.map((h) => h.name).join(", ")}`}
      </li>
    ))}
  </ul>
);
