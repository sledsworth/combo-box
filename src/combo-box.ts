/* eslint-disable @typescript-eslint/no-unused-vars */
import {LitElement, html, css} from 'lit'
import {
  customElement,
  property,
  state,
  query,
  queryAssignedElements,
} from 'lit/decorators.js'
import {ifDefined} from 'lit/directives/if-defined.js'
import AnacapriEvent from './AnacapriEvent'

/**
 * The Combo Box provides the user with a text input field and suggestions as they type.
 * Clicking on a suggestion prefills the text input field.
 *
 * The main purpose of the combo box is to:
 *  - attach all necessary aria labels to make the provided options accessible to all users
 *  - expand and collapse the suggestions as focus changes
 *  - provide a developer hooks into selected options and user input
 *
 * What this component does not do is filter suggestions based on user input, the developer
 * is responsible for providing the suggestions as li elements to the Combo Box.
 *
 * @fires select - The option the user has selected from the suggestions box
 * @fires input - The input the user has typed in the field
 *
 * @slot - The li elements to provide to the user as options
 * @slot indicator - A loading or success indicator to give the user feedback on the status
 * 	of the dropdown state or selected option choice.
 * @csspart input - The input element of the combo box
 * @csspart suggestion-list - The ul element that contains the offered suggestions of the combo box
 * @csspart suggestion-selected - The currently highlighted suggestion in the list of the combo box
 */
@customElement('combo-box')
export class ComboBox extends LitElement {
  static formAssociated = true
  static override styles = css`
    * {
      box-sizing: border-box;
    }

    :host {
      --border-radius: 2px;
      --box-shadow: 0px 8px 16px 0px rgb(0 0 0 / 20%);
      --color-background-selected: #e4f4fe;

      position: relative;
      display: inline-block;
    }

    input {
      width: 100%;
      font-size: 1rem;
      padding: 0.3125rem 0.5rem 0.375rem;
      border-radius: var(--border-radius);
      border: 1px solid #aaa;
      /* margin: 0 0.5rem 1rem 0; */
      display: inline-block;
      position: relative;
    }

    ul {
      margin: 0;
      position: absolute;
      padding: 0;
      width: 100%;
      list-style: none;
      visibility: hidden;
      border-radius: var(--border-radius);
      border: 1px solid #aaa;
      box-shadow: var(--box-shadow);
      max-height: 18rem;
      font-size: 1rem;
      overflow-x: auto;
      display: block;
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
      background-color: var(--color-background-selected);
      color: var(--color-forground-selected);
    }

    ::slotted(li[disabled]) {
      text-decoration: line-through;
      color: grey;
      cursor: default;
    }
  `
  private eventAbortController = new AbortController()

  private pointerX?: number
  private pointerY?: number

  @state()
  selectedItem?: HTMLLIElement | null

  @state()
  isExpanded = false

  @property({attribute: 'value'})
  value = ''

  @property()
  label?: string

  @property({attribute: 'input-id'})
  inputId?: string

  @property({attribute: 'allow-navigation-wrap'})
  allowNavigationWrap = false

  @query('input')
  input?: HTMLInputElement

  @queryAssignedElements({flatten: true, selector: ':not([disabled])'})
  listItems!: Array<HTMLLIElement>

  override render() {
    // console.log(this.listItems.length, this.selectedItem)

    // this.listItems.forEach((element) => {
    //   element.setAttribute(
    //     'aria-selected',
    //     element === this.selectedItem ? 'true' : 'false'
    //   )
    // })

    return html`
      <input
        part="input"
        id=${ifDefined(this.inputId)}
        role="combobox"
        aria-label="${ifDefined(this.label)}"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-controls="combo-box-suggestion-list"
        aria-activedescendant="${ifDefined(this.selectedItem?.id)}"
        @focus=${this.handleFocusInput}
        @keydown=${this.handleKeyboardInput}
        @input=${this.handleInput}
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
        @click=${this.commitSelection}
      >
        <slot @slotchange=${this.handleSlotchange}></slot>
      </ul>
    `
  }

  override focus() {
    this.input?.focus()
  }

  private handleInput(e: Event) {
    e.stopPropagation()
    const target = e.target as HTMLInputElement
    this.isExpanded = true
    const event = new AnacapriEvent('input', {
      detail: {
        target,
        value: target.value,
      },
    })
    this.dispatchEvent(event)
  }

  private handleFocusInput() {
    if (this.listItems.length > 0) {
      this.isExpanded = true
    }
  }

  // private handleBlurInput(e: FocusEvent) {
  //   // e.preventDefault()
  //   console.log(
  //     'blur',
  //     e.target,
  //     e.relatedTarget && !this.contains(e.relatedTarget as HTMLElement),
  //     e.relatedTarget,
  //     this
  //   )
  //   if (e.relatedTarget && !this.contains(e.relatedTarget as HTMLElement)) {
  //     this.isExpanded = false
  //   }
  // }

  private handleKeyboardInput(e: KeyboardEvent) {
    // const selectedItemIndex = this.selectedItem
    //   ? this.listItems.indexOf(this.selectedItem)
    //   : -1
    // const nextIndex = selectedItemIndex + 1
    // const lastIndex = selectedItemIndex - 1

    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        this.commitSelection()
        break
      case 'ArrowDown':
        e.preventDefault()
        this.navigateSelection(1)
        // this.selectedItem?.setAttribute('aria-selected', 'false')
        // if (nextIndex < this.listItems.length) {
        //   this.selectedItem = this.listItems[nextIndex]
        //   this.selectedItem?.scrollIntoView()
        // } else {
        //   this.selectedItem = this.listItems[0]
        //   this.selectedItem?.scrollIntoView()
        // }
        // this.selectedItem?.setAttribute('aria-selected', 'true')
        break
      case 'ArrowUp':
        e.preventDefault()
        this.navigateSelection(-1)
        // this.selectedItem?.setAttribute('aria-selected', 'false')
        // if (lastIndex >= 0) {
        //   this.selectedItem = this.listItems[lastIndex]
        //   this.selectedItem?.scrollIntoView()
        // } else {
        //   this.selectedItem = this.listItems[this.listItems.length - 1]
        //   this.selectedItem?.scrollIntoView()
        // }
        // this.selectedItem?.setAttribute('aria-selected', 'true')
        break
      case 'Escape':
        this.isExpanded = false
        break
      case 'Tab':
        this.isExpanded = false
        break
      default:
        this.selectedItem?.setAttribute('aria-selected', 'false')
        this.selectedItem = null
        this.listItems[0]?.scrollIntoView()
    }
  }

  private navigateSelection(step: -1 | 1) {
    const currentIndex = this.selectedItem
      ? this.listItems.indexOf(this.selectedItem)
      : -1
    let nextIndex = currentIndex + step
    if (nextIndex < 0 && this.allowNavigationWrap) {
      nextIndex = this.listItems.length - 1
    }
    if (nextIndex >= this.listItems.length) {
      nextIndex = this.allowNavigationWrap
        ? nextIndex % this.listItems.length
        : (nextIndex = this.listItems.length - 1)
    }
    this.selectSuggestion(this.listItems[nextIndex])
    // if (nextIndex >= 0) {
    //   if (!this.allowNavigationWrap) {
    //     if (nextIndex < this.listItems.length) {
    //       this.selectSuggestion(this.listItems[nextIndex])
    //     }
    //   } else {
    //     this.selectSuggestion(this.listItems[nextIndex % this.listItems.length])
    //   }
    // }
  }

  private deselectSuggestion(suggestion: HTMLLIElement) {
    suggestion.setAttribute('aria-selected', 'false')
    suggestion.removeAttribute('part')
    this.selectedItem = null
  }

  private selectSuggestion(suggestion: HTMLLIElement) {
    if (this.selectedItem) {
      this.deselectSuggestion(this.selectedItem)
    }
    suggestion.setAttribute('aria-selected', 'true')
    suggestion.setAttribute('part', 'suggestion-selected')
    suggestion.scrollIntoView()
    this.selectedItem = suggestion
  }

  private handleSlotchange() {
    this.eventAbortController.abort()
    this.eventAbortController = new AbortController()

    for (const element of this.listItems) {
      element.setAttribute('role', 'option')
      element.addEventListener(
        'pointerover',
        (e: PointerEvent) => {
          if (e.x !== this.pointerX || e.y !== this.pointerY) {
            this.selectedItem?.setAttribute('aria-selected', 'false')
            // console.log('triggered mouse over')
            this.selectedItem = element as HTMLLIElement
            this.selectedItem?.setAttribute('aria-selected', 'true')
          }
        },
        {signal: this.eventAbortController.signal}
      )
    }
  }

  private commitSelection() {
    if (!(this.selectedItem instanceof Element)) return
    const target = this.selectedItem?.closest('[role="option"]') as HTMLElement
    if (!target) return
    if (target) {
      const event = new AnacapriEvent('select', {
        detail: {
          target,
          value: target.getAttribute('data-value') || target.id,
          id: target.id,
        },
      })
      this.dispatchEvent(event)
      this.input?.focus()
      this.selectedItem?.setAttribute('aria-selected', 'false')
      this.selectedItem = null
      this.isExpanded = false
      // console.log('click', target)
      // target?.click()
    }
  }

  override connectedCallback() {
    super.connectedCallback()
    this.handleSlotchange()
    document.addEventListener('pointermove', (e: PointerEvent) => {
      this.pointerX = e.x
      this.pointerY = e.y
    })
    document.addEventListener('click', (e: MouseEvent) => {
      // console.log(e.target, e.relatedTarget)
      if (e.target && this.contains(e.target as HTMLElement)) {
        this.input?.focus()
      } else {
        this.isExpanded = false
      }
    })
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.eventAbortController.abort()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'combo-box': ComboBox
  }
}
