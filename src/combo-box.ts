import {LitElement, html, css} from 'lit'
import {
  customElement,
  property,
  state,
  query,
  queryAssignedElements,
} from 'lit/decorators.js'
import {ifDefined} from 'lit/directives/if-defined.js'
import AnacapriEvent from './utils/AnacapriEvent'

/**
 * The Combo Box provides the user with a text input field and suggestions as they type.
 * Clicking on a suggestion pre-fills the text input field.
 *
 * The main purpose of the combo box is to:
 *  - attach all necessary aria attributes to make the provided options accessible to all users
 *     via keyboard or mouse input
 *  - expand and collapse the suggestions as focus enters and leaves input
 *  - provide a developer hooks into selected suggestions and user input
 *
 * What this component does not do is filter suggestions based on user input, the developer
 * is responsible for providing the suggestions as li elements to the Combo Box.
 *
 * Internally, a selected suggestion is one that the user has either hovered over or
 * navigated to via keyboard.
 *
 * @fires select - The option the user has selected from the suggestions box
 * @fires input - The input the user has typed in the field
 *
 * @slot - The li elements to provide to the user as options
 * @slot indicator - A loading or success indicator to give the user feedback on the status
 * 	of the dropdown state or selected option choice.
 * @csspart input - The input element of the combo box
 * @csspart suggestion-list - The ul element that contains the offered suggestions of the combo box
 */
@customElement('combo-box')
export class ComboBox extends LitElement {
  /**
   * This tells the browser that our custom element should behave like a form
   * element. This allows us to label the combo-box, as well as add additional
   * form features like validity in the future.
   */
  static formAssociated = true

  static override styles = css`
    * {
      box-sizing: border-box;
    }

    :host {
      position: relative;
      display: inline-block;

      --combo-box-suggestion-list-border: 1px solid #555;
      --combo-box-suggestion-list-border-radius: 2px;
      --combo-box-suggestion-list-box-shadow: 0px 8px 16px 0px rgb(0 0 0 / 20%);
      --combo-box-suggestion-list-color-background-selected: #eee;
    }

    ul {
      display: block;
      position: absolute;
      visibility: hidden;
      overflow-x: auto;
      margin: 0;
      padding: 0;
      width: 100%;
      list-style: none;
      border-radius: var(--combo-box-suggestion-list-border-radius);
      border: var(--combo-box-suggestion-list-border);
      box-shadow: var(--combo-box-suggestion-list-box-shadow);
    }

    ul[aria-expanded='true'] {
      visibility: visible;
    }

    .input-indicator {
      position: absolute;
      right: 0.5rem;
      top: 0;
      height: 100%;
      display: flex;
      align-items: center;
    }

    ::slotted(li) {
      cursor: pointer;
      padding: 0.5rem 1rem;
    }

    ::slotted(li[aria-selected='true']) {
      background-color: var(
        --combo-box-suggestion-list-color-background-selected
      );
      color: var(--combo-box-suggestion-list-color-foreground-selected);
    }

    ::slotted(li[disabled]) {
      cursor: not-allowed;
    }
  `

  /**
   * Abort controller responsible for removing all event listeners related to
   * the suggestion list when being collapsed.
   */
  private suggestionListAbortController?: AbortController | null

  /**
   * Custom element form internals.
   *
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/attachInternals
   */
  private formInternals?: ElementInternals

  /**
   * Safari has a bug (at least I think it is a bug, specs are ambiguous) where
   * scrolling a box behind the pointer will trigger pointer enter events, even if the
   * pointer has not moved. This was causing issues with keybaord navigation. To
   * solve for this we need to keep track of the pointer location
   * and only handle pointer move events if the user has actually moved the pointer.
   *
   * @link https://w3c.github.io/pointerevents/#the-pointermove-event
   */
  private pointerX?: number
  private pointerY?: number

  /**
   * The currently moused over or keyboard focused suggestion from the suggestion list.
   */
  @state()
  selectedSuggestion?: HTMLLIElement | null

  /**
   * Whether the suggestion list of the combo box is expanded and showing or not.
   */
  @state()
  isExpanded = false

  /**
   * The value of the input field.
   */
  @property({attribute: 'value'})
  value = ''

  /**
   * The aria label of the input field. Safari doesn't support form custom elements,
   * so wrapping the combo box in a label won't link the label to the input. Instead,
   * pass the label string to make the field more accessible.
   */
  @property()
  label?: string

  /**
   * Should the keyboard navigation wrap when stepping off the ends? For instance,
   * pressing the up arrow when on the first suggestion will go to the end of the list
   * if this is true.
   */
  @property({attribute: 'allow-navigation-wrap'})
  allowNavigationWrap = true

  /**
   * Should the Tab key navigate the suggested items when expanded?
   */
  @property({attribute: 'allow-tab-navigation'})
  allowTabNavigation = false

  @query('input')
  inputElement?: HTMLInputElement

  @query('#combo-box-suggestion-list')
  suggestionListElement?: HTMLUListElement

  @queryAssignedElements({flatten: true, selector: ':not([disabled])'})
  suggestionItemElements!: Array<HTMLLIElement>

  constructor() {
    super()

    if (
      'ElementInternals' in window &&
      'setFormValue' in window.ElementInternals.prototype
    ) {
      this.formInternals = this.attachInternals()
    }
  }

  override render() {
    return html`
      <input
        part="input"
        role="combobox"
        aria-label="${ifDefined(this.label)}"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-controls="combo-box-suggestion-list"
        aria-activedescendant="${ifDefined(this.selectedSuggestion?.id)}"
        @focus=${this.handleFocusInput}
        @input=${this.handleInput}
        @keydown=${this.handleKeyboardNavigation}
        .value=${this.value}
      />
      <div class="input-indicator">
        <slot name="indicator"></slot>
      </div>
      <ul
        part="suggestion-list"
        id="combo-box-suggestion-list"
        role="listbox"
        aria-expanded="${this.isExpanded}"
      >
        <slot @slotchange=${this.prepareSuggestionElements}></slot>
      </ul>
    `
  }

  /**
   * Expands the suggestion list on focus if there are items to show.
   */
  private handleFocusInput() {
    if (this.suggestionItemElements.length > 0) {
      this.expandSuggestionList()
    }
  }

  /**
   * Stops the propagation of the input event and creates own event to pass input value.
   * This seems a bit strange, but if we don't do this the listener event object will
   * have the target set as the combo-box, which means target.value won't be correct.
   *
   * @param e the input event from the combo-box text field
   */
  private handleInput(e: InputEvent) {
    e.stopPropagation()
    const target = e.target as HTMLInputElement
    this.expandSuggestionList()
    const event = new AnacapriEvent('input', {
      detail: {
        value: target.value,
      },
    })
    this.dispatchEvent(event)
  }

  /**
   * The keyboard navigation handler is split out from the input handling as we don't
   * need to send modifier key presses to the developer to handle, only input. Here
   * we handle navigating the selected suggestion via keyboard, as well as collapsing
   * the suggestion list or commiting a selection.
   *
   * @param e keyboard events while focused in the input textbox
   */
  private handleKeyboardNavigation(e: KeyboardEvent) {
    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        this.commitSelection()
        break
      case 'ArrowDown':
        e.preventDefault()
        this.navigateSelection(1)
        break
      case 'ArrowUp':
        e.preventDefault()
        this.navigateSelection(-1)
        break
      case 'Escape':
        this.collapseSuggestionList()
        break
      case 'Tab':
        if (this.allowTabNavigation && this.isExpanded) {
          e.preventDefault()
          if (e.shiftKey) {
            this.navigateSelection(-1)
          } else {
            this.navigateSelection(1)
          }
        } else {
          this.collapseSuggestionList()
        }
        break
      case 'Shift':
      case 'Alt':
      case 'Meta':
      case 'Ctrl':
        break
    }
  }

  private handlePointerMoveSelection(e: PointerEvent) {
    if (!(e.target instanceof Element)) return
    const target = e.target.closest('[role="option"]') as HTMLLIElement
    if (!target || (this.pointerX === e.x && this.pointerY === e.y)) return
    console.log('handle mouse move')
    this.selectSuggestion(target, false)
    this.pointerX = e.x
    this.pointerY = e.y
  }

  private handleClickEvents(e: MouseEvent) {
    if (e.target && this.contains(e.target as HTMLElement)) {
      this.inputElement?.focus()
    } else {
      this.collapseSuggestionList()
    }
  }

  /**
   * Moves selection of list item elements in the suggested list elements array by
   * the number passed in. If walking off the end of array and allowNavigationWrap
   * is true, we wrap around to zero. The reverse is also true. If allowNavigationWrap
   * is false, we clamp movement at the ends and do nothing instead.
   *
   * @param step number to traverse the suggested list elements array by
   */
  private navigateSelection(step: -1 | 1) {
    const currentIndex = this.selectedSuggestion
      ? this.suggestionItemElements.indexOf(this.selectedSuggestion)
      : -1
    let nextIndex = currentIndex + step
    if (!this.allowNavigationWrap) {
      nextIndex = Math.max(
        Math.min(this.suggestionItemElements.length - 1, nextIndex),
        0
      )
    } else if (nextIndex < 0) {
      nextIndex = this.suggestionItemElements.length - 1
    } else if (nextIndex >= this.suggestionItemElements.length) {
      nextIndex = 0
    }
    if (currentIndex !== nextIndex) {
      this.selectSuggestion(this.suggestionItemElements[nextIndex])
    }
  }

  /**
   * Handles setting the selected suggestion to null and removing accessibility labels,
   * classes, and any other specific state a selected suggestion may have.
   *
   * @param suggestion The list item element to deselect, defaults to currently selected suggestion
   */
  private deselectSuggestion(suggestion = this.selectedSuggestion) {
    suggestion?.setAttribute('aria-selected', 'false')
    suggestion?.classList.remove('selected')
    this.selectedSuggestion = null
  }

  /**
   * Handles setting a suggestion as selected. A selected suggestion is one the user is
   * currently mousing over or focusing on via keyboard navigation. Adds necessary
   * aria- attributes, classes, and scrolls item into view if desired.
   *
   * @param suggestion The list item element to select
   * @param shouldScrollIntoView Whether the item being selected should be scrolled into
   * view
   */
  private selectSuggestion(
    suggestion: HTMLLIElement,
    shouldScrollIntoView = true
  ) {
    this.deselectSuggestion()
    suggestion.setAttribute('aria-selected', 'true')
    suggestion.classList.add('selected')
    if (shouldScrollIntoView) {
      suggestion.scrollIntoView()
    }
    this.selectedSuggestion = suggestion
  }

  /**
   * Slotted suggestion elements setup. Add role option to all elements for
   * accessibility, as well as handles maintaining selection on the last element
   * selected. Scrolls the selected element into view if it still exists in the list
   * otherwise scroll back to the top. Uses ids to determine if the elements are the
   * same, it's important that these are unique.
   */
  private prepareSuggestionElements() {
    const lastSelectedSuggestion = this.selectedSuggestion
    this.selectedSuggestion = null

    for (const element of this.suggestionItemElements) {
      element.setAttribute('role', 'option')

      if (element.id === lastSelectedSuggestion?.id) {
        this.selectedSuggestion = element
      }
    }

    if (this.selectedSuggestion) {
      this.selectedSuggestion.scrollIntoView()
    } else {
      this.suggestionItemElements[0]?.scrollIntoView()
    }
  }

  /**
   * Dispatches 'select' event with the currently selected list item, if there is a
   * selected item. Also sets form internals value to the data-value of the element.
   */
  private commitSelection() {
    if (!(this.selectedSuggestion instanceof Element)) return
    const target = this.selectedSuggestion?.closest(
      '[role="option"]'
    ) as HTMLLIElement
    if (!target) return

    const event = new AnacapriEvent('select', {
      detail: {
        target,
        value: target.dataset.value,
        id: target.id,
      },
    })
    this.dispatchEvent(event)
    this.formInternals?.setFormValue(target.dataset.value || null)
    this.inputElement?.focus()
    this.collapseSuggestionList()
  }

  /**
   * Expands the suggestion list, sets up all event listeners on the list.
   */
  private expandSuggestionList() {
    if (!this.suggestionListAbortController) {
      this.suggestionListAbortController = new AbortController()
    }
    document.addEventListener('click', (e) => this.handleClickEvents(e), {
      signal: this.suggestionListAbortController.signal,
    })
    this.suggestionListElement?.addEventListener(
      'pointerover',
      (e) => this.handlePointerMoveSelection(e),
      {signal: this.suggestionListAbortController.signal}
    )
    this.suggestionListElement?.addEventListener(
      'click',
      () => this.commitSelection(),
      {signal: this.suggestionListAbortController.signal}
    )
    this.isExpanded = true
  }

  /**
   * Hides suggestion list and removes all listeners from the list. Also deselects any
   * suggestion.
   */
  private collapseSuggestionList() {
    this.suggestionListAbortController?.abort()
    this.suggestionListAbortController = null
    this.deselectSuggestion()
    this.isExpanded = false
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'combo-box': ComboBox
  }
}
