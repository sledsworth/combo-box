/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {ComboBox} from '../combo-box.js'

import {assert} from '@open-wc/testing'

suite('combo-box', () => {
  test('is defined', () => {
    const el = document.createElement('combo-box')
    assert.instanceOf(el, ComboBox)
  })
})
