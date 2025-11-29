/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import applyLensThemeInjectable from "../apply-lens-theme.injectable";

import type { DiContainer } from "@ogre-tools/injectable";
import type { ApplyLensTheme } from "../apply-lens-theme.injectable";
import type { LensTheme } from "../lens-theme";

describe("apply lens theme", () => {
    let applyTheme: ApplyLensTheme;
    let di: DiContainer;

    beforeEach(() => {
        di = getDiForUnitTesting();
        applyTheme = di.inject(applyLensThemeInjectable);

        // Setup DOM environment
        document.documentElement.style.cssText = "";
        document.body.className = "";
    });

    it("applies theme colors as CSS variables", () => {
        const testTheme: Partial<LensTheme> = {
            name: "Test Theme",
            type: "dark",
            description: "Test",
            author: "Test",
            monacoTheme: "clouds-midnight",
            colors: {
                primary: "#00a7a0",
                textColorPrimary: "#8e9297",
                mainBackground: "#1e2124",
            } as any,
            terminalColors: {},
        };

        applyTheme(testTheme as LensTheme);

        expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#00a7a0");
        expect(document.documentElement.style.getPropertyValue("--textColorPrimary")).toBe("#8e9297");
        expect(document.documentElement.style.getPropertyValue("--mainBackground")).toBe("#1e2124");
    });

    it("applies custom colorRestartedOutline variable", () => {
        const testTheme: Partial<LensTheme> = {
            name: "Test",
            type: "dark",
            description: "Test",
            author: "Test",
            monacoTheme: "clouds-midnight",
            colors: {
                colorRestartedOutline: "#00ff00", // Green instead of yellow
            } as any,
            terminalColors: {},
        };

        applyTheme(testTheme as LensTheme);

        expect(document.documentElement.style.getPropertyValue("--colorRestartedOutline")).toBe("#00ff00");
    });

    it("toggles theme-light class for light themes", () => {
        const lightTheme: Partial<LensTheme> = {
            name: "Light",
            type: "light",
            description: "Light theme",
            author: "Test",
            monacoTheme: "vs",
            colors: {} as any,
            terminalColors: {},
        };

        applyTheme(lightTheme as LensTheme);

        expect(document.body.classList.contains("theme-light")).toBe(true);
    });

    it("removes theme-light class for dark themes", () => {
        document.body.classList.add("theme-light");

        const darkTheme: Partial<LensTheme> = {
            name: "Dark",
            type: "dark",
            description: "Dark theme",
            author: "Test",
            monacoTheme: "clouds-midnight",
            colors: {} as any,
            terminalColors: {},
        };

        applyTheme(darkTheme as LensTheme);

        expect(document.body.classList.contains("theme-light")).toBe(false);
    });
});
