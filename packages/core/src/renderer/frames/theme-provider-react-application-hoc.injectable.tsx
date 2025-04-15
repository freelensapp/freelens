import { reactApplicationHigherOrderComponentInjectionToken } from "@freelensapp/react-application";
import { StyledEngineProvider, ThemeProvider } from "@mui/material";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import { defaultMuiBaseTheme } from "../mui-base-theme";

const themeProviderReactApplicationHocInjectable = getInjectable({
  id: "theme-provider-react-application-hoc",

  instantiate:
    () =>
    ({ children }) => (
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={defaultMuiBaseTheme}>{children}</ThemeProvider>
      </StyledEngineProvider>
    ),

  injectionToken: reactApplicationHigherOrderComponentInjectionToken,
});

export default themeProviderReactApplicationHocInjectable;
