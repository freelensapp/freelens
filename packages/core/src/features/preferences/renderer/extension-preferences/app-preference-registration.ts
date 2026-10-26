/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type React from "react";

/**
 * Both are rendered without props. One that needs something, such as the
 * extension instance, gets it from the registration:
 * `Input: () => <MyInput extension={this} />`.
 */
export interface AppPreferenceComponents {
  Hint: React.ComponentType;
  Input: React.ComponentType;
}

export interface AppPreferenceRegistration {
  title: string;
  id?: string;
  showInPreferencesTab?: string;
  components: AppPreferenceComponents;
}

export interface RegisteredAppPreference extends AppPreferenceRegistration {
  id: string;
}
