/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import { observer } from "mobx-react";
import styles from "./search-input-url.module.scss";

import type { SavedSearch } from "../../../features/user-preferences/common/preferences-helpers";

export interface SavedSearchesPanelProps {
  searches: SavedSearch[];
  /** False while there is nothing worth naming, which disables saving. */
  canSave: boolean;
  newName: string;
  onNewNameChange: (name: string) => void;
  onSave: () => void;
  onApply: (saved: SavedSearch) => void;
  onDelete: (name: string) => void;
}

/** The saved searches of the current view, and the row that adds one. */
export const SavedSearchesPanel = observer(
  ({ searches, canSave, newName, onNewNameChange, onSave, onApply, onDelete }: SavedSearchesPanelProps) => (
    <div className={styles.suggestions} data-testid="saved-searches">
      <div className={styles.hint}>Saved searches for this view</div>
      {searches.length === 0 && <div className={styles.hint}>None yet</div>}
      {searches.map((entry) => (
        <div
          key={entry.name}
          className={cssNames(styles.suggestion, styles.savedSearch)}
          data-testid={`saved-search-${entry.name}`}
          // mousedown, not click: the input blurs first otherwise and the panel
          // unmounts before the click ever lands.
          onMouseDown={(evt) => {
            evt.preventDefault();
            onApply(entry);
          }}
        >
          <span className={styles.suggestionField}>{entry.name}</span>
          <Icon
            small
            material="delete"
            className={styles.savedSearchDelete}
            // Also mousedown, and stopped: the row's own handler would apply
            // the search before a click on the bin ever landed.
            onMouseDown={(evt) => {
              evt.preventDefault();
              evt.stopPropagation();
              onDelete(entry.name);
            }}
            tooltip={`Delete saved search: ${entry.name}`}
          />
        </div>
      ))}
      <div className={styles.saveRow}>
        <input
          className={styles.saveName}
          placeholder={canSave ? "Save current search as..." : "Nothing to save yet"}
          disabled={!canSave}
          value={newName}
          onChange={(evt) => onNewNameChange(evt.target.value)}
          onKeyDown={(evt) => {
            if (evt.key === "Enter") {
              evt.preventDefault();
              onSave();
            }

            // The search box's own handler would read these as editing the query.
            evt.stopPropagation();
          }}
        />
        <button
          type="button"
          className={styles.saveButton}
          disabled={!canSave || newName.trim() === ""}
          onClick={onSave}
          data-testid="save-search"
        >
          Save
        </button>
      </div>
    </div>
  ),
);
