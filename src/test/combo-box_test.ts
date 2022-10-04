/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {ComboBox} from '../combo-box.js'

import {fixture, assert, oneEvent} from '@open-wc/testing'
import {sendKeys, sendMouse} from '@web/test-runner-commands'
import {html} from 'lit/static-html.js'

suite('combo-box', () => {
  test('is defined', () => {
    const el = document.createElement('combo-box')
    assert.instanceOf(el, ComboBox)
  })

  test('renders with default values', async () => {
    const el = await fixture(html`<combo-box></combo-box>`)
    const suggestions = el.shadowRoot?.querySelector(
      '#combo-box-suggestion-list'
    )
    assert.equal(suggestions?.getAttribute('aria-expanded'), 'false')
  })

  test('Should not display the suggestion box if items are not available and the input element is focused', async () => {
    const el = (await fixture(html`<combo-box></combo-box>`)) as ComboBox

    const suggestions = el.shadowRoot?.querySelector(
      '#combo-box-suggestion-list'
    )
    const input = el.shadowRoot?.querySelector('input')
    input?.focus()
    await el.updateComplete

    assert.equal(suggestions?.getAttribute('aria-expanded'), 'false')
  })

  test('Should not display the suggestion box if items are available and the input element is not focused', async () => {
    const el = (await fixture(
      html`<combo-box><li>Some option</li></combo-box>`
    )) as ComboBox

    const suggestions = el.shadowRoot?.querySelector(
      '#combo-box-suggestion-list'
    )

    assert.equal(suggestions?.getAttribute('aria-expanded'), 'false')
  })

  test('Should display the suggestion box if items are available and the input element is focused', async () => {
    const el = (await fixture(
      html`<combo-box><li>Some option</li></combo-box>`
    )) as ComboBox

    const suggestions = el.shadowRoot?.querySelector(
      '#combo-box-suggestion-list'
    )
    const input = el.shadowRoot?.querySelector('input')
    input?.focus()
    await el.updateComplete

    assert.equal(suggestions?.getAttribute('aria-expanded'), 'true')
  })

  test('Should hide the suggestion box if the escape key is pressed', async () => {
    const el = (await fixture(
      html`<combo-box><li>Some option</li></combo-box>`
    )) as ComboBox

    const suggestions = el.shadowRoot?.querySelector(
      '#combo-box-suggestion-list'
    )
    const input = el.shadowRoot?.querySelector('input')
    input?.focus()
    await el.updateComplete
    assert.equal(suggestions?.getAttribute('aria-expanded'), 'true')
    await sendKeys({press: 'Escape'})
    await el.updateComplete
    assert.equal(suggestions?.getAttribute('aria-expanded'), 'false')
  })

  test('Should hide the suggestion box if tabbing to remove focus', async () => {
    const el = (await fixture(
      html`<combo-box><li>Some option</li></combo-box>`
    )) as ComboBox

    const suggestions = el.shadowRoot?.querySelector(
      '#combo-box-suggestion-list'
    )
    const input = el.shadowRoot?.querySelector('input')
    input?.focus()
    await el.updateComplete
    assert.equal(suggestions?.getAttribute('aria-expanded'), 'true')
    await sendKeys({press: 'Tab'})
    await el.updateComplete
    assert.equal(suggestions?.getAttribute('aria-expanded'), 'false')
  })

  test('Should hide the suggestion box if clicking outside of the combo box.', async () => {
    const page = await fixture(
      html`
        <div>
          <combo-box><li>Some option</li></combo-box>
        </div>
      `
    )

    const el = page.querySelector('combo-box') as ComboBox

    const suggestions = el.shadowRoot?.querySelector(
      '#combo-box-suggestion-list'
    )
    const input = el.shadowRoot?.querySelector('input')
    input?.focus()
    await el.updateComplete
    assert.equal(suggestions?.getAttribute('aria-expanded'), 'true')
    await sendMouse({
      type: 'click',
      position: [500, 500],
    })
    await el.updateComplete
    assert.equal(suggestions?.getAttribute('aria-expanded'), 'false')
  })

  test('Should select first item in suggestions when pressing arrow down key without any item selected.', async () => {
    const el = (await fixture(
      html`<combo-box>
        <li>Some option</li>
        <li>Some option</li>
        <li>Some option</li>
        <li>Some option</li>
      </combo-box>`
    )) as ComboBox

    const input = el.shadowRoot?.querySelector('input')
    input?.focus()
    await el.updateComplete
    assert.isNotOk(el.selectedSuggestion)
    await sendKeys({press: 'ArrowDown'})
    await el.updateComplete
    assert.equal(el.selectedSuggestion, el.suggestionItemElements[0])
  })

  test('Should be able to select and cycle the suggestions with the arrow down key.', async () => {
    const el = (await fixture(
      html`<combo-box>
        <li id="li-0">Some option</li>
        <li id="li-1">Some option</li>
        <li id="li-2" disabled>Some option</li>
        <li id="li-3">Some option</li>
      </combo-box>`
    )) as ComboBox
    const orderedIds = ['li-0', 'li-1', 'li-3']
    const input = el.shadowRoot?.querySelector('input')
    input?.focus()
    await el.updateComplete
    assert.isNotOk(el.selectedSuggestion)
    for (let i = 0; i < 7; i++) {
      await sendKeys({press: 'ArrowDown'})
      await el.updateComplete
      const id = orderedIds[i % 3]
      const element = el.querySelector(`#${id}`)
      assert.equal(el.selectedSuggestion, element)
    }
  })

  test('Should be able to select and cycle the suggestions with the arrow up key.', async () => {
    const el = (await fixture(
      html`<combo-box>
        <li id="li-0">Some option</li>
        <li id="li-1">Some option</li>
        <li id="li-2" disabled>Some option</li>
        <li id="li-3">Some option</li>
      </combo-box>`
    )) as ComboBox
    const orderedIds = ['li-3', 'li-1', 'li-0']
    const input = el.shadowRoot?.querySelector('input')
    input?.focus()
    await el.updateComplete
    assert.isNotOk(el.selectedSuggestion)
    for (let i = 0; i < 7; i++) {
      await sendKeys({press: 'ArrowUp'})
      await el.updateComplete
      const id = orderedIds[i % 3]
      const element = el.querySelector(`#${id}`)
      assert.equal(el.selectedSuggestion, element)
    }
  })

  test('Should select the last item in suggestions when pressing arrow up key without any item selected.', async () => {
    const el = (await fixture(
      html`<combo-box>
        <li>Some option</li>
        <li>Some option</li>
        <li>Some option</li>
        <li>Some option</li>
      </combo-box>`
    )) as ComboBox

    const input = el.shadowRoot?.querySelector('input')
    input?.focus()
    await el.updateComplete
    assert.isNotOk(el.selectedSuggestion)
    await sendKeys({press: 'ArrowUp'})
    await el.updateComplete
    assert.equal(
      el.selectedSuggestion,
      el.suggestionItemElements[el.suggestionItemElements.length - 1]
    )
  })

  test('Should find all list item elements passed in that are not disabled as potential selectable elements.', async () => {
    const el = (await fixture(
      html`<combo-box>
        <li>Some option</li>
        <li disabled>Some option</li>
        <li>Some option</li>
        <li>Some option</li>
        <div slot="indicator">loading...</div>
      </combo-box>`
    )) as ComboBox

    await el.updateComplete
    assert.equal(el.suggestionItemElements.length, 3)
  })

  test('Should find all list item elements passed in that are not disabled as potential selectable elements.', async () => {
    const el = (await fixture(
      html`<combo-box>
        <li>Some option</li>
        <li disabled>Some option</li>
        <li>Some option</li>
        <li>Some option</li>
        <div slot="indicator">loading...</div>
      </combo-box>`
    )) as ComboBox

    await el.updateComplete
    assert.equal(el.suggestionItemElements.length, 3)
  })

  test('Should select the item in the list on mouse entering the list item element.', async () => {
    const el = (await fixture(
      html`<combo-box>
        <li>Some option</li>
        <li disabled>Some option</li>
        <li id="target">Some option</li>
        <li>Some option</li>
        <div slot="indicator">loading...</div>
      </combo-box>`
    )) as ComboBox

    const input = el.shadowRoot?.querySelector('input')
    input?.focus()
    await el.updateComplete

    const target = el.querySelector('#target')
    const rect = target?.getBoundingClientRect()

    await sendMouse({
      type: 'move',
      position: [Math.floor(rect?.x || 0) + 1, Math.floor(rect?.y || 0) + 1],
    })
    await el.updateComplete
    assert.equal(el.selectedSuggestion, target)
  })

  test('Should fire select event when item is clicked on.', async () => {
    const el = (await fixture(
      html`<combo-box>
        <li>Some option</li>
        <li disabled>Some option</li>
        <li id="target">Some option</li>
        <li>Some option</li>
        <div slot="indicator">loading...</div>
      </combo-box>`
    )) as ComboBox

    const input = el.shadowRoot?.querySelector('input')
    input?.focus()
    await el.updateComplete

    const target = el.querySelector('#target')
    const rect = target?.getBoundingClientRect()
    sendMouse({
      type: 'click',
      position: [Math.floor(rect?.x || 0) + 1, Math.floor(rect?.y || 0) + 1],
    })

    const selectEvent = await oneEvent(el, 'select')
    el.requestUpdate()
    await el.updateComplete
    assert(selectEvent.detail.id, 'target')
  })

  test('Should fire input event when user types in the field.', async () => {
    const el = (await fixture(
      html`<combo-box>
        <li>Some option</li>
        <li disabled>Some option</li>
        <li id="target">Some option</li>
        <li>Some option</li>
        <div slot="indicator">loading...</div>
      </combo-box>`
    )) as ComboBox
    const simulatedTypedString = 'hello'
    let indexOfNextLetterTyped = 1

    const input = el.shadowRoot?.querySelector('input')
    input?.focus()
    await el.updateComplete
    el.addEventListener('input', (e) => {
      assert.equal(
        (e as CustomEvent).detail.value,
        simulatedTypedString.slice(0, indexOfNextLetterTyped)
      )
      indexOfNextLetterTyped++
    })

    await sendKeys({
      type: simulatedTypedString,
    })
  })

  test('Should be able to pass value property that will be passed as the input value.', async () => {
    const el = (await fixture(
      html`<combo-box value="hello">
        <li>Some option</li>
        <li disabled>Some option</li>
        <li id="target">Some option</li>
        <li>Some option</li>
        <div slot="indicator">loading...</div>
      </combo-box>`
    )) as ComboBox

    const input = el.shadowRoot?.querySelector('input')
    assert.equal(input?.value, 'hello')
    input?.focus()

    await sendKeys({
      type: ' world',
    })
    await el.updateComplete
    assert.equal(input?.value, 'hello world')
  })
})
