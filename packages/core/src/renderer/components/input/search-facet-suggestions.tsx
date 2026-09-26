/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { cssNames } from "@freelensapp/utilities";
import { observer } from "mobx-react";
import { facetOperatorSymbol, facetOperators } from "./search-facets";
import styles from "./search-input-url.module.scss";

import type { FacetOperator, SearchFieldOption } from "./search-facets";

export interface SearchFacetSuggestionsProps {
  /** Fields the typed text can be turned into a facet on. */
  options: SearchFieldOption[];
  /** The text being typed, previewed on each option. */
  value: string;
  operator: FacetOperator;
  onPickOperator: (op: FacetOperator) => void;
  highlighted: number;
  onHighlight: (index: number) => void;
  onPick: (field: string) => void;
}

/** Operator row plus the fields the current text can be committed against. */
export const SearchFacetSuggestions = observer(
  ({ options, value, operator, onPickOperator, highlighted, onHighlight, onPick }: SearchFacetSuggestionsProps) => (
    <div className={styles.suggestions} data-testid="search-facet-suggestions">
      <div className={styles.operators}>
        {facetOperators.map(({ op, title, symbol }) => (
          <button
            type="button"
            key={op}
            className={cssNames(styles.operator, { [styles.operatorActive]: op === operator })}
            data-testid={`search-facet-operator-${op}`}
            title={title}
            // Keeps focus (and the typed text) in the input; the click still
            // fires, and Tab still reaches the button for keyboard users.
            onMouseDown={(evt) => evt.preventDefault()}
            onClick={() => onPickOperator(op)}
          >
            {symbol}
          </button>
        ))}
      </div>
      <div className={styles.hint}>Add a filter for</div>
      {options.map((option, index) => (
        <div
          key={option.id}
          className={cssNames(styles.suggestion, { [styles.highlighted]: index === highlighted })}
          data-testid={`search-facet-option-${option.id}`}
          onMouseEnter={() => onHighlight(index)}
          // mousedown, not click: the input blurs first otherwise and this list
          // unmounts before the click ever lands.
          onMouseDown={(evt) => {
            evt.preventDefault();
            onPick(option.id);
          }}
        >
          <span className={styles.suggestionField}>{option.title}</span>
          <span className={styles.suggestionOperator}>{facetOperatorSymbol(operator)}</span>
          <span className={styles.suggestionValue}>{value}</span>
        </div>
      ))}
    </div>
  ),
);
