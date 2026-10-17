/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { editor } from "monaco-editor";
import { useEffect, useRef } from "react";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import activeThemeInjectable from "../../themes/active.injectable";
import { createMonacoUri } from "./monaco-editor";
import { yamlValidator } from "./monaco-validators";

import type { IComputedValue } from "mobx";

import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";
import type { LensTheme } from "../../themes/lens-theme";

export interface MonacoDiffEditorProps {
  id: string;
  original: string;
  value: string;
  sideBySide: boolean;
  onChange: (value: string) => void;
  onError: (error: string) => void;
}

interface Dependencies {
  state: UserPreferencesState;
  activeTheme: IComputedValue<LensTheme>;
}

export const NonInjectedMonacoDiffEditor = observer((props: MonacoDiffEditorProps & Dependencies) => {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<editor.IStandaloneDiffEditor | undefined>(undefined);
  const originalModel = useRef<editor.ITextModel | undefined>(undefined);
  const draftModel = useRef<editor.ITextModel | undefined>(undefined);
  const latest = useRef(props);

  latest.current = props;
  const theme = props.activeTheme.get().monacoTheme;
  const options = { ...props.state.editorConfiguration };

  useEffect(() => {
    if (!container.current) return;

    const current = latest.current;
    const uri = createMonacoUri(current.id);
    // The dock owns this model. Keep it alive when switching back to the plain editor.
    const draft = editor.getModel(uri) ?? editor.createModel(current.value, "yaml", uri);
    const original = editor.createModel(current.original, "yaml");
    const diff = editor.createDiffEditor(container.current, {
      ...current.state.editorConfiguration,
      theme: current.activeTheme.get().monacoTheme,
      automaticLayout: true,
      originalEditable: false,
      readOnly: false,
      renderSideBySide: current.sideBySide,
      useInlineViewWhenSpaceIsLimited: false,
      ignoreTrimWhitespace: false,
    });

    instance.current = diff;
    originalModel.current = original;
    draftModel.current = draft;
    diff.setModel({ original, modified: draft });

    const validate = () => {
      try {
        yamlValidator(draft.getValue());
      } catch (error) {
        latest.current.onError(String(error));
      }
    };
    const subscription = draft.onDidChangeContent(() => {
      latest.current.onChange(draft.getValue());
      validate();
    });

    validate();
    diff.getModifiedEditor().focus();

    return () => {
      subscription.dispose();
      diff.dispose();
      original.dispose();
      instance.current = undefined;
      originalModel.current = undefined;
      draftModel.current = undefined;
    };
  }, [props.id]);

  useEffect(() => {
    if (originalModel.current?.getValue() !== props.original) originalModel.current?.setValue(props.original);
    if (draftModel.current?.getValue() !== props.value) draftModel.current?.setValue(props.value);
  }, [props.original, props.value]);

  useEffect(() => {
    editor.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    instance.current?.updateOptions({
      ...options,
      renderSideBySide: props.sideBySide,
      originalEditable: false,
      readOnly: false,
    });
  }, [options, props.sideBySide]);

  return <div ref={container} aria-label="Resource YAML diff" className="flex-1 min-h-0 relative" />;
});

export const MonacoDiffEditor = withInjectables<Dependencies, MonacoDiffEditorProps>(NonInjectedMonacoDiffEditor, {
  getProps: (di, props) => ({
    ...props,
    state: di.inject(userPreferencesStateInjectable),
    activeTheme: di.inject(activeThemeInjectable),
  }),
});
