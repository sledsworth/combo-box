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
import AnacapriEvent from './utils/AnacapriEvent'

/**
 *
 *
 * @fires count-changed - Indicates when the count changes
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement('combo-box')
export class ComboBox extends LitElement {
  static override styles = css`
    * {
      box-sizing: border-box;
    }

    :host {
      --ana-border-radius: 2px;
      --ana-box-shadow: 0px 8px 16px 0px rgb(0 0 0 / 20%);
      --ana-color-background-selected: #e4f4fe;

      position: relative;
      display: inline-block;
    }

    input {
      width: 100%;
      font-size: 1rem;
      padding: 0.3125rem 0.5rem 0.375rem;
      border-radius: var(--ana-border-radius);
      border: 1px solid #aaa;
      margin: 0 0.5rem 1rem 0;
      display: inline-block;
      position: relative;
    }

    ul {
      margin: -1rem 0 0;
      position: absolute;
      padding: 0;
      width: 100%;
      list-style: none;
      visibility: hidden;
      border-radius: var(--ana-border-radius);
      border: 1px solid #aaa;
      box-shadow: var(--ana-box-shadow);
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
      height: 2rem;
      display: flex;
      align-items: center;
    }

    ::slotted(li) {
      cursor: pointer;
      padding: 0.5rem 1rem;
    }

    ::slotted(li[aria-selected='true']) {
      background-color: var(--ana-color-background-selected);
      color: var(--ana-color-forground-selected);
    }

    ::slotted(li[disabled]) {
      text-decoration: line-through;
      color: grey;
      cursor: default;
    }
  `
  eventAbortController = new AbortController()

  pointerX?: number
  pointerY?: number

  @state()
  selectedItem?: HTMLLIElement | null

  @state()
  isExpanded = false

  @property()
  value = ''

  @property()
  isTrackingSelection = false

  @property()
  label?: string

  @query('input')
  input?: HTMLInputElement

  @queryAssignedElements({flatten: true, selector: ':not([disabled])'})
  listItems!: Array<HTMLLIElement>

  override render() {
    console.log(this.listItems.length, this.selectedItem)

    // this.listItems.forEach((element) => {
    //   element.setAttribute(
    //     'aria-selected',
    //     element === this.selectedItem ? 'true' : 'false'
    //   )
    // })

    return html`
      <input
        id="ana-combo-box-input"
        role="combobox"
        aria-label="${ifDefined(this.label)}"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-controls="ana-combo-box-suggestions"
        aria-activedescendant="${ifDefined(this.selectedItem?.id)}"
        @blur=${this.handleBlurInput}
        @focus=${this.handleFocusInput}
        @keydown=${this.handleKeyboardInput}
        @input=${this.handleInput}
        .value=${this.value}
      />
      <div class="input-indicator">
        <slot name="indicator"></slot>
      </div>
      <ul
        id="ana-combo-box-suggestions"
        role="listbox"
        aria-expanded="${this.isExpanded}"
        @click=${this.commitSelection}
      >
        <slot @slotchange=${this.handleSlotchange}></slot>
      </ul>
    `
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

  private handleBlurInput(e: FocusEvent) {
    // e.preventDefault()
    console.log(
      'blur',
      e.relatedTarget && !this.contains(e.relatedTarget as HTMLElement),
      e.relatedTarget,
      this
    )
    if (e.relatedTarget && !this.contains(e.relatedTarget as HTMLElement)) {
      this.isExpanded = false
    }
  }

  private handleKeyboardInput(e: KeyboardEvent) {
    const selectedItemIndex = this.selectedItem
      ? this.listItems.indexOf(this.selectedItem)
      : -1
    const nextIndex = selectedItemIndex + 1
    const lastIndex = selectedItemIndex - 1

    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        // this.selectedItem?.click()
        this.commitSelection()
        break
      case 'ArrowDown':
        e.preventDefault()
        this.selectedItem?.setAttribute('aria-selected', 'false')
        if (nextIndex < this.listItems.length) {
          this.selectedItem = this.listItems[nextIndex]
          this.selectedItem?.scrollIntoView()
        } else {
          this.selectedItem = this.listItems[0]
          this.selectedItem?.scrollIntoView()
        }
        this.selectedItem?.setAttribute('aria-selected', 'true')
        break
      case 'ArrowUp':
        e.preventDefault()
        this.selectedItem?.setAttribute('aria-selected', 'false')
        if (lastIndex >= 0) {
          this.selectedItem = this.listItems[lastIndex]
          this.selectedItem?.scrollIntoView()
        } else {
          this.selectedItem = this.listItems[this.listItems.length - 1]
          this.selectedItem?.scrollIntoView()
        }
        this.selectedItem?.setAttribute('aria-selected', 'true')
        break
      case 'Escape':
        this.isExpanded = false
        break
      default:
        this.selectedItem?.setAttribute('aria-selected', 'false')
        this.selectedItem = null
        this.listItems[0]?.scrollIntoView()
    }
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
            console.log('triggered mouse over')
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
