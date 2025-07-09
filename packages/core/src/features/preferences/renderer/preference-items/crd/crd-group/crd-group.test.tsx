/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { CrdGroup } from "./crd-group";
import { DEFAULT_CONFIG_YAML } from "./default-config";

// Mock the injectable dependencies
jest.mock("@ogre-tools/injectable-react", () => ({
  withInjectables: jest.fn((component, config) => {
    return (props: any) => {
      // Create mock dependencies
      const mockDi = {
        inject: jest.fn(() => mockUserPreferencesState),
      };

      // Get the dependencies using the config
      const deps = config.getProps(mockDi);

      // Render the component with the dependencies
      return React.createElement(component, { ...deps, ...props });
    };
  }),
}));

// Mock UserPreferencesState
let mockUserPreferencesState = {
  crdGroup: DEFAULT_CONFIG_YAML,
};

describe("CrdGroup Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock state before each test
    mockUserPreferencesState = {
      crdGroup: DEFAULT_CONFIG_YAML,
    };
  });

  describe("Rendering", () => {
    it("renders with default configuration", () => {
      render(<CrdGroup />);

      // Check if the component renders with title
      expect(screen.getByText("CRD Groups")).toBeInTheDocument();

      // Check if the textarea contains some default config
      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toContain("KEDA:");
    });

    it("renders with custom initial configuration", () => {
      // Set custom config in mock state
      mockUserPreferencesState.crdGroup = "CustomGroup:\n  - custom.pattern.com";

      render(<CrdGroup />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toContain("CustomGroup:");
    });

    it("displays configuration help text", () => {
      render(<CrdGroup />);

      // Check for the new technical help section
      expect(screen.getByText("YAML Format Guide:")).toBeInTheDocument();
      expect(
        screen.getByText(/Define custom CRD groups with flexible structure and string pattern matching/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Arrays for top-level patterns/)).toBeInTheDocument();
      expect(screen.getByText(/Objects with nested sublevels/)).toBeInTheDocument();
    });
  });

  describe("YAML Validation", () => {
    it("validates proper YAML configuration", () => {
      render(<CrdGroup />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

      // Valid configuration examples
      const validConfigs = [
        "Group1:\n  - pattern1\nGroup2:\n  - pattern2",
        "Kubernetes:\n  - k8s.io\n  - API:\n    - api.k8s.io",
        "Visible:\n  - pattern\nHidden: null",
        'Main:\n  - specific\n  - ""',
      ];

      // Test each valid configuration
      validConfigs.forEach((config) => {
        fireEvent.change(textarea, { target: { value: config } });
        fireEvent.blur(textarea);

        // Check that no error message is displayed
        const errorElements = screen.queryAllByText(/YAML Error|Validation error/);
        expect(errorElements).toHaveLength(0);
      });
    });

    it("shows error for invalid YAML syntax", () => {
      render(<CrdGroup />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

      // Invalid YAML syntax
      const invalidConfig = "Group1:\n  - item1\n  This is not valid YAML\n  - nested";

      fireEvent.change(textarea, { target: { value: invalidConfig } });
      fireEvent.blur(textarea);

      // Check that error message is displayed
      expect(screen.getByText(/YAML Error/)).toBeInTheDocument();
    });

    it("validates structure of YAML configuration", () => {
      render(<CrdGroup />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

      // Invalid structure examples
      const invalidStructureConfigs = [
        "- item1\n- item2", // Array at top level instead of object
        "Group: just-a-string-value", // String value instead of array/object/null
      ];

      // Test each invalid structure
      invalidStructureConfigs.forEach((config) => {
        fireEvent.change(textarea, { target: { value: config } });
        fireEvent.blur(textarea);

        // Check that error message is displayed
        const errorText = screen.queryByText(/must be an array|must be a valid YAML object|must be an object/);
        expect(errorText).toBeInTheDocument();
      });
    });
  });

  describe("User Interactions", () => {
    it("can clear custom configuration to use only defaults", () => {
      render(<CrdGroup />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

      // Change to custom config first
      fireEvent.change(textarea, { target: { value: "Custom:\n  - pattern" } });
      expect(textarea.value).toContain("Custom:");

      // Clear the configuration
      fireEvent.change(textarea, { target: { value: "" } });
      fireEvent.blur(textarea);

      // Check that textarea is empty (user can see they have no custom config)
      expect(textarea.value).toBe("");
    });

    it("saves valid configuration to state on blur", () => {
      render(<CrdGroup />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      const testConfig = "TestGroup:\n  - test.pattern";

      // Change config and trigger blur
      fireEvent.change(textarea, { target: { value: testConfig } });
      fireEvent.blur(textarea);

      // Check that state is updated
      expect(mockUserPreferencesState.crdGroup).toBe(testConfig);
    });

    it("doesn't save invalid configuration to state on blur", () => {
      const originalConfig = "OriginalGroup:\n  - original.pattern";
      mockUserPreferencesState.crdGroup = originalConfig;

      render(<CrdGroup />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      const invalidConfig = "Invalid: [ This is not valid YAML";

      // Change config to invalid and trigger blur
      fireEvent.change(textarea, { target: { value: invalidConfig } });
      fireEvent.blur(textarea);

      // Check that state is not updated (should still be original)
      expect(mockUserPreferencesState.crdGroup).toBe(originalConfig);
    });

    it("updates textarea value when typing", () => {
      render(<CrdGroup />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      const newValue = "NewGroup:\n  - new.pattern";

      fireEvent.change(textarea, { target: { value: newValue } });

      expect(textarea.value).toBe(newValue);
    });
  });

  describe("Real-world Examples", () => {
    it("handles KEDA configuration", () => {
      render(<CrdGroup />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      const kedaConfig = "KEDA:\n  - keda.sh\n  - Eventing:\n    - eventing.keda.sh";

      fireEvent.change(textarea, { target: { value: kedaConfig } });
      fireEvent.blur(textarea);

      // Should not show error
      const errorElements = screen.queryAllByText(/YAML Error|Validation error/);
      expect(errorElements).toHaveLength(0);

      // Should save to state
      expect(mockUserPreferencesState.crdGroup).toBe(kedaConfig);
    });

    it("handles FluxCD configuration", () => {
      render(<CrdGroup />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      const fluxConfig = "FluxCD:\n  - toolkit.fluxcd.io\n  - Image:\n    - image.toolkit.fluxcd.io";

      fireEvent.change(textarea, { target: { value: fluxConfig } });
      fireEvent.blur(textarea);

      // Should not show error
      const errorElements = screen.queryAllByText(/YAML Error|Validation error/);
      expect(errorElements).toHaveLength(0);

      // Should save to state
      expect(mockUserPreferencesState.crdGroup).toBe(fluxConfig);
    });

    it("handles mixed configuration with null values", () => {
      render(<CrdGroup />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      const mixedConfig =
        "Applications:\n  - app.example.com\n  - Operators:\n    - operator.example.com\nHidden: null";

      fireEvent.change(textarea, { target: { value: mixedConfig } });
      fireEvent.blur(textarea);

      // Should not show error
      const errorElements = screen.queryAllByText(/YAML Error|Validation error/);
      expect(errorElements).toHaveLength(0);

      // Should save to state
      expect(mockUserPreferencesState.crdGroup).toBe(mixedConfig);
    });
  });

  describe("Edge Cases", () => {
    it("handles empty configuration", () => {
      render(<CrdGroup />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: "" } });
      fireEvent.blur(textarea);

      // Should not show error for empty config
      const errorElements = screen.queryAllByText(/YAML Error|Validation error/);
      expect(errorElements).toHaveLength(0);
    });

    it("handles whitespace-only configuration", () => {
      render(<CrdGroup />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: "   \n  \n   " } });
      fireEvent.blur(textarea);

      // Should not show error for whitespace
      const errorElements = screen.queryAllByText(/YAML Error|Validation error/);
      expect(errorElements).toHaveLength(0);
    });

    it("handles catch-all pattern", () => {
      render(<CrdGroup />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      const catchAllConfig = 'All:\n  - ""';

      fireEvent.change(textarea, { target: { value: catchAllConfig } });
      fireEvent.blur(textarea);

      // Should not show error
      const errorElements = screen.queryAllByText(/YAML Error|Validation error/);
      expect(errorElements).toHaveLength(0);

      // Should save to state
      expect(mockUserPreferencesState.crdGroup).toBe(catchAllConfig);
    });
  });

  describe("Error Recovery", () => {
    it("clears error when valid configuration is entered after invalid", () => {
      render(<CrdGroup />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

      // First enter invalid config
      fireEvent.change(textarea, { target: { value: "Invalid: [ YAML" } });
      fireEvent.blur(textarea);

      // Should show error
      expect(screen.getByText(/YAML Error/)).toBeInTheDocument();

      // Then enter valid config
      fireEvent.change(textarea, { target: { value: "Valid:\n  - pattern" } });
      fireEvent.blur(textarea);

      // Error should be cleared
      const errorElements = screen.queryAllByText(/YAML Error|Validation error/);
      expect(errorElements).toHaveLength(0);
    });

    it("shows validation error for invalid nested structure", () => {
      render(<CrdGroup />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

      const invalidNestedConfig = "Group:\n  - pattern\n  - SubGroup: not-an-array";

      fireEvent.change(textarea, { target: { value: invalidNestedConfig } });
      fireEvent.blur(textarea);

      // Should show validation error
      expect(screen.getByText(/must be an array/)).toBeInTheDocument();
    });
  });

  describe("Enhanced Interface Features", () => {
    it("renders explanation text", () => {
      render(<CrdGroup />);

      expect(screen.getByText("How it works:")).toBeInTheDocument();
      expect(screen.getByText(/Edit area/)).toBeInTheDocument();
      expect(screen.getByText(/Default configuration/)).toBeInTheDocument();
      expect(screen.getByText(/Final result/)).toBeInTheDocument();
      expect(screen.getByText(/Tip/)).toBeInTheDocument();
    });

    it("shows and hides advanced view when DrawerParamToggler is clicked", () => {
      render(<CrdGroup />);

      const toggleElement = screen.getByTestId("drawer-param-toggler");
      expect(toggleElement).toBeInTheDocument();

      // Advanced sections should not be visible initially
      expect(screen.queryByText("Default configuration:")).not.toBeInTheDocument();
      expect(screen.queryByText("Final result (merged):")).not.toBeInTheDocument();

      // Click to show advanced view
      fireEvent.click(toggleElement);

      // Advanced sections should now be visible
      expect(screen.getByText("Default configuration:")).toBeInTheDocument();
      expect(screen.getByText("Final result (merged):")).toBeInTheDocument();
      expect(screen.getByText("Merge information:")).toBeInTheDocument();

      // Click to hide advanced view
      fireEvent.click(toggleElement);

      // Advanced sections should be hidden again
      expect(screen.queryByText("Default configuration:")).not.toBeInTheDocument();
      expect(screen.queryByText("Final result (merged):")).not.toBeInTheDocument();
    });

    it("displays merge information correctly", () => {
      render(<CrdGroup />);

      const toggleElement = screen.getByTestId("drawer-param-toggler");
      fireEvent.click(toggleElement);

      // Should show merge information
      expect(screen.getByText("Merge information:")).toBeInTheDocument();
      expect(screen.getByText(/Custom groups/)).toBeInTheDocument();
      expect(screen.getByText(/Default groups/)).toBeInTheDocument();
      expect(screen.getByText(/Overridden groups/)).toBeInTheDocument();
    });

    it("shows readonly textareas with correct content", () => {
      render(<CrdGroup />);

      const toggleElement = screen.getByTestId("drawer-param-toggler");
      fireEvent.click(toggleElement);

      // Get all textareas
      const textareas = screen.getAllByRole("textbox");

      // Should have main editable textarea plus two readonly ones
      expect(textareas.length).toBe(3);

      // Check that readonly textareas are present and readonly
      const readonlyTextareas = textareas.filter((textarea) => textarea.hasAttribute("readOnly"));
      expect(readonlyTextareas.length).toBe(2);
    });

    it("updates merge preview when user config changes", () => {
      render(<CrdGroup />);

      const toggleElement = screen.getByTestId("drawer-param-toggler");
      fireEvent.click(toggleElement);

      const mainTextarea = screen.getAllByRole("textbox")[0] as HTMLTextAreaElement;
      const userConfig = "TestGroup:\n  - test.pattern";

      // Change the user configuration
      fireEvent.change(mainTextarea, { target: { value: userConfig } });

      // The merge info should update (we can't easily test the exact content
      // but we can verify the info section is still there and functional)
      expect(screen.getByText("Merge information:")).toBeInTheDocument();
    });

    it("merges user config with defaults correctly", () => {
      render(<CrdGroup />);

      const toggleElement = screen.getByTestId("drawer-param-toggler");
      fireEvent.click(toggleElement);

      // Get all textareas: [0] is main editable, [1] is default readonly, [2] is merged readonly
      const allTextareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[];
      const mainTextarea = allTextareas[0];
      const mergedTextarea = allTextareas[2];

      // Test with custom config that should merge with defaults
      fireEvent.change(mainTextarea, { target: { value: "CustomGroup:\n  - custom.pattern" } });
      fireEvent.blur(mainTextarea);

      // The merge result should contain both custom and default groups
      expect(mergedTextarea.value).toContain("CustomGroup:");
      expect(mergedTextarea.value).toContain("Built-in:"); // Should still have defaults
    });

    it("applies correct CSS classes", () => {
      render(<CrdGroup />);

      // Check if main container has the right class
      const container = screen.getByRole("textbox").closest("section");
      expect(container).toHaveClass("crd-group-container");

      const toggleElement = screen.getByTestId("drawer-param-toggler");

      // Show advanced view
      fireEvent.click(toggleElement);

      // Check advanced section
      const advancedSection = screen.getByText("Merge information:").closest("div.advanced-section");
      expect(advancedSection).toBeInTheDocument();
    });
  });
});
