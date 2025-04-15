/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { lensThemeDeclarationInjectionToken } from "./declaration";
import type { LensTheme } from "./lens-theme";

const lensLightThemeInjectable = getInjectable({
  id: "lens-light-theme",
  instantiate: () => {
    const theme: LensTheme = {
      name: "Light",
      type: "light" as const,
      description: "Original Lens light theme",
      author: "Mirantis",
      monacoTheme: "vs" as const,
      colors: {
        blue: "#00a7a0",
        magenta: "#c93dce",
        golden: "#ffc63d",
        halfGray: "#87909c80",
        primary: "#800a7a0",
        textColorPrimary: "#555555",
        textColorSecondary: "#51575d",
        textColorTertiary: "#555555",
        textColorAccent: "#222222",
        textColorDimmed: "#5557598c",
        borderColor: "#c9cfd3",
        borderFaintColor: "#dfdfdf",
        mainBackground: "#f1f1f1",
        secondaryBackground: "#f2f3f5",
        contentColor: "#ffffff",
        layoutBackground: "#e8e8e8",
        layoutTabsBackground: "#f8f8f8",
        layoutTabsActiveColor: "#333333",
        layoutTabsLineColor: "#87909c80",
        sidebarLogoBackground: "#f1f1f1",
        sidebarActiveColor: "#ffffff",
        sidebarSubmenuActiveColor: "#00a7a0",
        sidebarBackground: "#e8e8e8",
        sidebarItemHoverBackground: "#f0f2f5",
        badgeBackgroundColor: "#ffba44",
        buttonPrimaryBackground: "#00a7a0",
        buttonDefaultBackground: "#414448",
        buttonLightBackground: "#f1f1f1",
        buttonAccentBackground: "#e85555",
        buttonDisabledBackground: "#808080",
        tableBgcStripe: "#f8f8f8",
        tableBgcSelected: "#f4f5f5",
        tableHeaderBackground: "#f1f1f1",
        tableHeaderColor: "#555555",
        tableSelectedRowColor: "#222222",
        helmLogoBackground: "#ffffff",
        helmStableRepo: "#00a7a0",
        helmIncubatorRepo: "#ff7043",
        helmDescriptionHr: "#dddddd",
        helmDescriptionBlockquoteColor: "#555555",
        helmDescriptionBlockquoteBorder: "#8a8f93",
        helmDescriptionBlockquoteBackground: "#eeeeee",
        helmDescriptionHeaders: "#3e4147",
        helmDescriptionH6: "#6a737d",
        helmDescriptionTdBorder: "#c6c6c6",
        helmDescriptionTrBackground: "#1c2125",
        helmDescriptionCodeBackground: "#ffffff1a",
        helmDescriptionPreBackground: "#eeeeee",
        helmDescriptionPreColor: "#555555",
        colorSuccess: "#206923",
        colorOk: "#399c3d",
        colorInfo: "#2d71a4",
        colorError: "#ce3933",
        colorSoftError: "#e85555",
        colorWarning: "#ff9800",
        colorVague: "#ededed",
        colorTerminated: "#9dabb5",
        dockHeadBackground: "#e8e8e8",
        dockInfoBackground: "#f3f3f3",
        dockInfoBorderColor: "#c9cfd3",
        dockEditorBackground: "#24292e",
        dockEditorTag: "#8e97a3",
        dockEditorKeyword: "#ffffff",
        dockEditorComment: "#808080",
        dockEditorActiveLineBackground: "#3a3d41",
        dockBadgeBackground: "#dedede",
        dockTabBorderColor: "#d5d4de",
        dockTabActiveBackground: "#ffffff",
        logsBackground: "#24292e",
        logsForeground: "#ffffff",
        logRowHoverBackground: "#35373a",
        dialogTextColor: "#87909c",
        dialogBackground: "#ffffff",
        dialogHeaderBackground: "#36393e",
        dialogFooterBackground: "#f4f4f4",
        drawerTogglerBackground: "#eaeced",
        drawerTitleText: "#ffffff",
        drawerSubtitleBackground: "#f1f1f1",
        drawerItemNameColor: "#727272",
        drawerItemValueColor: "#555555",
        clusterMenuBackground: "#e2e2e2",
        clusterMenuBorderColor: "#c9cfd3",
        clusterMenuCellBackground: "#d2d2d2",
        clusterMenuCellOutline: "#22222266",
        clusterSettingsBackground: "#ffffff",
        addClusterIconColor: "#8d8d8d",
        boxShadow: "#0000003a",
        iconActiveColor: "#ffffff",
        iconActiveBackground: "#a6a6a694",
        filterAreaBackground: "#f7f7f7",
        chartLiveBarBackground: "#00000033",
        chartStripesColor: "#00000009",
        chartCapacityColor: "#cccccc",
        pieChartDefaultColor: "#efefef",
        inputOptionHoverColor: "#ffffff",
        inputControlBackground: "#f6f6f7",
        inputControlBorder: "#cccdcf",
        inputControlHoverBorder: "#b9bbbe",
        lineProgressBackground: "#e8e8e8",
        radioActiveBackground: "#f1f1f1",
        menuActiveBackground: "#00a7a0",
        menuSelectedOptionBgc: "#e8e8e8",
        canvasBackground: "#24292e",
        scrollBarColor: "#bbbbbb",
        settingsBackground: "#ffffff",
        settingsColor: "#555555",
        navSelectedBackground: "#ffffff",
        navHoverColor: "#2e3135",
        hrColor: "#06060714",
        tooltipBackground: "#ffffff",
      },
      terminalColors: {
        background: "#ffffff",
        foreground: "#2d2d2d",
        cursor: "#2d2d2d",
        cursorAccent: "#ffffff",
        selectionBackground: "#add6ff",
        selectionInactiveBackground: "#add6ff80",
        black: "#2d2d2d",
        red: "#cd3734 ",
        green: "#18cf12",
        yellow: "#acb300",
        blue: "#00a7a0",
        magenta: "#c100cd",
        cyan: "#07c4b9",
        white: "#d3d7cf",
        brightBlack: "#a8a8a8",
        brightRed: "#ff6259",
        brightGreen: "#5cdb59",
        brightYellow: "#f8c000",
        brightBlue: "#008db6",
        brightMagenta: "#ee55f8",
        brightCyan: "#50e8df",
        brightWhite: "#eeeeec",
      },
    };

    return theme;
  },
  injectionToken: lensThemeDeclarationInjectionToken,
});

export default lensLightThemeInjectable;
