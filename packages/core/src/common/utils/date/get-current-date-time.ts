/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export const getCurrentDateTime = () => new Date().toISOString();

export const getMillisecondsFromUnixEpoch = () => Date.now();

export const getSecondsFromUnixEpoch = () => Math.floor(getMillisecondsFromUnixEpoch() / 1000);
