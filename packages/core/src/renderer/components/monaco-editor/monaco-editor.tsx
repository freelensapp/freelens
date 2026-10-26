/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { cssNames, disposer } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import autoBindReact from "auto-bind/react";
import { debounce, merge } from "es-toolkit/compat";
import { action, compareShallow, observable, observableRef, reaction } from "mobx";
import { observer } from "mobx-react";
import { editor, Uri } from "monaco-editor";
import React from "react";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import activeThemeInjectable from "../../themes/active.injectable";
import getEditorHeightFromLinesCountInjectable from "./get-editor-height-from-lines-number.injectable";
import styles from "./monaco-editor.module.scss";
import { type MonacoValidator, monacoValidators } from "./monaco-validators";

import type { Logger } from "@freelensapp/logger";

import type { IComputedValue } from "mobx";

import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";
import type { LensTheme } from "../../themes/lens-theme";
import type { MonacoTheme } from "./monaco-themes";

export type MonacoEditorId = string;

export interface MonacoEditorProps {
  id?: MonacoEditorId; // associating editor's ID with created model.uri
  className?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;
  readOnly?: boolean;
  theme?: MonacoTheme;
  language?: "yaml" | "json"; // supported list of languages, configure in `webpack.renderer.ts`
  options?: Partial<editor.IStandaloneEditorConstructionOptions>; // customize editor's initialization options
  value: string;
  onChange?(value: string, evt: editor.IModelContentChangedEvent): void; // catch latest value updates
  onError?(error: unknown): void; // provide syntax validation error, etc.
  onDidLayoutChange?(info: editor.EditorLayoutInfo): void;
  onDidContentSizeChange?(evt: editor.IContentSizeChangedEvent): void;
  onModelChange?(model: editor.ITextModel, prev?: editor.ITextModel): void;
  innerRef?: React.ForwardedRef<MonacoEditorRef>;
  setInitialHeight?: boolean;
}

interface Dependencies {
  state: UserPreferencesState;
  activeTheme: IComputedValue<LensTheme>;
  getEditorHeightFromLinesCount: (linesCount: number) => number;
  logger: Logger;
}

export function createMonacoUri(id: MonacoEditorId): Uri {
  return Uri.file(`/monaco-editor/${id}`);
}

const monacoViewStates = new WeakMap<Uri, editor.ICodeEditorViewState>();

export interface MonacoEditorRef {
  focus(): void;
}

@observer
class NonInjectedMonacoEditor extends React.Component<MonacoEditorProps & Dependencies> {
  static defaultProps = {
    language: "yaml" as const,
  };

  private staticId = `editor-id#${Math.round(1e7 * Math.random())}`;
  private dispose = disposer();

  @observableRef accessor containerElem: HTMLDivElement | null = null;
  @observableRef accessor editor: editor.IStandaloneCodeEditor | undefined = undefined;
  @observable accessor dimensions: { width?: number; height?: number } = {};
  @observable accessor unmounting = false;

  // TODO: investigate how to replace with "common/logger"
  //  currently leads for stucking UI forever & infinite loop.
  //  e.g. happens on tab change/create, maybe some other cases too.
  private logger = console;

  // mobx-react 9 forbids reading this.props inside a derivation, and the getters
  // below are read from the componentDidMount reactions (their own derivations).
  // Keep an observable snapshot of props (refreshed on update) so those getters
  // stay reactive across that boundary.
  @observableRef private accessor observableProps: Readonly<MonacoEditorProps & Dependencies>;

  constructor(props: MonacoEditorProps & Dependencies) {
    super(props);
    this.observableProps = props;
    autoBindReact(this);
  }

  componentDidUpdate(prevProps: Readonly<MonacoEditorProps & Dependencies>) {
    // React 19 resolves `defaultProps` into a new props object on every render,
    // including the re-render that the observer runs when observableProps
    // changes. Replacing the snapshot unconditionally would make every update
    // schedule another one, forever, since render reads observableProps.
    if (!compareShallow(prevProps, this.props)) {
      this.observableProps = this.props;
    }
  }

  // These getters read props from the observable snapshot (observableProps), not
  // this.props: mobx-react 9 forbids reading this.props inside a derivation, and
  // they are evaluated from the componentDidMount reactions below.
  get id(): MonacoEditorId {
    return this.observableProps.id ?? this.staticId;
  }

  get theme() {
    return this.observableProps.theme ?? this.observableProps.activeTheme.get().monacoTheme;
  }

  get model(): editor.ITextModel {
    const uri = createMonacoUri(this.id);
    const model = editor.getModel(uri);

    if (model) {
      return model; // already exists
    }

    const { language, value: rawValue } = this.observableProps;
    const value = typeof rawValue === "string" ? rawValue : "";

    if (typeof rawValue !== "string") {
      this.observableProps.logger.error(`[MONACO-EDITOR]: Passed a non-string default value`, { rawValue });
    }

    return editor.createModel(value, language, uri);
  }

  get options(): editor.IStandaloneEditorConstructionOptions {
    return merge({}, this.observableProps.state.editorConfiguration, this.observableProps.options);
  }

  private get logMetadata() {
    return {
      editorId: this.id,
      model: this.model,
    };
  }

  /**
   * Monitor editor's dom container element box-size and sync with monaco's dimensions
   * @private
   */
  private bindResizeObserver(monacoEditor: editor.IStandaloneCodeEditor) {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;

        this.setDimensions(width, height);
      }
    });

    const containerElem = monacoEditor.getContainerDomNode();

    resizeObserver.observe(containerElem);

    return () => resizeObserver.unobserve(containerElem);
  }

  protected onModelChange(model: editor.ITextModel, oldModel?: editor.ITextModel) {
    if (!this.editor) {
      return;
    }

    this.logger.info("[MONACO]: model change", { model, oldModel }, this.logMetadata);

    if (oldModel) {
      this.saveViewState(oldModel);
    }

    this.editor.setModel(model);
    this.restoreViewState(model);
    this.editor.layout();
    this.editor.focus(); // keep focus in editor, e.g. when clicking between dock-tabs
    this.props.onModelChange?.(model, oldModel);
    this.validateLazy();
  }

  /**
   * Save current view-model state in the editor.
   * This will allow restore cursor position, selected text, etc.
   */
  protected saveViewState(model: editor.ITextModel) {
    const viewState = this.editor?.saveViewState();

    if (viewState) {
      monacoViewStates.set(model.uri, viewState);
    }
  }

  protected restoreViewState(model: editor.ITextModel) {
    const viewState = monacoViewStates.get(model.uri);

    if (viewState) {
      this.editor?.restoreViewState(viewState);
    }
  }

  componentDidMount() {
    // React.StrictMode unmounts and mounts the same instance again in
    // development, so a mount has to undo what the previous unmount did.
    this.unmounting = false;

    try {
      this.createEditor();
      this.logger.debug(`[MONACO]: editor did mount`, this.logMetadata);
    } catch (error) {
      this.logger.error(`[MONACO]: mounting failed: ${error}`, this.logMetadata);
    }
  }

  componentWillUnmount() {
    this.unmounting = true;
    this.validateLazy.cancel();

    if (this.editor) {
      this.saveViewState(this.model);
      this.dispose();
      this.editor.dispose();
      this.editor = undefined;
    }
  }

  protected createEditor() {
    if (!this.containerElem || this.editor || this.unmounting) {
      return;
    }
    const { language, readOnly, value: defaultValue } = this.props;
    const { theme } = this;

    const monacoEditor = editor.create(this.containerElem, {
      model: this.model,
      detectIndentation: false, // allow `option.tabSize` to use custom number of spaces for [Tab]
      value: defaultValue,
      language,
      theme,
      readOnly,
      ...this.options,
    });

    this.editor = monacoEditor;
    this.logger.debug(`[MONACO]: editor created for language=${language}, theme=${theme}`, this.logMetadata);
    this.validateLazy(); // validate initial value
    this.restoreViewState(this.model); // restore previous state if any

    if (this.props.autoFocus) {
      monacoEditor.focus();
    }

    const onDidLayoutChangeDisposer = monacoEditor.onDidLayoutChange((layoutInfo) => {
      this.props.onDidLayoutChange?.(layoutInfo);
    });

    const onValueChangeDisposer = monacoEditor.onDidChangeModelContent((event) => {
      const value = monacoEditor.getValue();

      this.props.onChange?.(value, event);
      this.validateLazy(value);
    });

    const onContentSizeChangeDisposer = monacoEditor.onDidContentSizeChange((params) => {
      this.props.onDidContentSizeChange?.(params);
    });

    this.dispose.push(
      reaction(() => this.model, this.onModelChange),
      reaction(() => this.theme, editor.setTheme),
      reaction(
        () => this.observableProps.value,
        (value) => this.setValue(value),
        {
          fireImmediately: true,
        },
      ),
      reaction(
        () => this.options,
        (opts) => monacoEditor.updateOptions(opts),
      ),

      () => onDidLayoutChangeDisposer.dispose(),
      () => onValueChangeDisposer.dispose(),
      () => onContentSizeChangeDisposer.dispose(),
      this.bindResizeObserver(monacoEditor),
    );
  }

  @action
  setDimensions(width: number, height: number) {
    this.dimensions.width = width;
    this.dimensions.height = height;
    this.editor?.layout({ width, height });
  }

  setValue(value = ""): void {
    if (!this.editor || value == this.getValue()) return;

    this.editor.setValue(value);
    this.validate(value);
  }

  getValue(opts?: { preserveBOM: boolean; lineEnding: string }): string {
    return this.editor?.getValue(opts) ?? "";
  }

  focus() {
    this.editor?.focus();
  }

  @action
  validate(value = this.getValue()) {
    const validators: MonacoValidator[] = [
      monacoValidators[this.props.language!], // parsing syntax check
    ].filter(Boolean);

    for (const validate of validators) {
      try {
        validate(value);
      } catch (error) {
        this.props.onError?.(error); // emit error outside
      }
    }
  }

  // avoid excessive validations during typing
  validateLazy = debounce(this.validate, 250);

  get initialHeight() {
    return this.props.getEditorHeightFromLinesCount(this.model.getLineCount());
  }

  render() {
    const { className, style } = this.props;

    const css: React.CSSProperties = {
      ...style,
      height: style?.height ?? this.initialHeight,
    };

    return (
      <div
        data-test-id="monaco-editor"
        className={cssNames(styles.MonacoEditor, className)}
        style={css}
        ref={(elem) => {
          this.containerElem = elem;
        }}
      />
    );
  }
}

const ForwardedRefMonacoEditor = ({
  ref,
  ...props
}: MonacoEditorProps & Dependencies & { ref?: React.ForwardedRef<MonacoEditorRef> }) => (
  <NonInjectedMonacoEditor innerRef={ref} {...props} />
);

export const MonacoEditor = withInjectables<Dependencies, MonacoEditorProps, MonacoEditorRef>(
  // `withInjectables`'s ref-forwarding overload is typed for a
  // `ForwardRefExoticComponent`; `ForwardedRefMonacoEditor` now takes `ref` as a
  // regular prop (React 19), which the wrapper still forwards at runtime.
  ForwardedRefMonacoEditor as unknown as React.ForwardRefExoticComponent<
    MonacoEditorProps & Dependencies & React.RefAttributes<MonacoEditorRef>
  >,
  {
    getProps: (di, props) => ({
      ...props,
      state: di.inject(userPreferencesStateInjectable),
      activeTheme: di.inject(activeThemeInjectable),
      getEditorHeightFromLinesCount: di.inject(getEditorHeightFromLinesCountInjectable),
      logger: di.inject(loggerInjectionToken),
    }),
  },
);
