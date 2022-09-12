---
layout: page.11ty.cjs
title: <combo-box> ⌲ Home
---

# &lt;combo-box>

`<combo-box>` is an awesome element. It's a great introduction to building web components with LitElement, with nice documentation site as well.

## As easy as HTML

<section class="columns">
  <div>

`<combo-box>` is just an HTML element. You can it anywhere you can use HTML!

```html
<combo-box></combo-box>
```

  </div>
  <div>

<combo-box></combo-box>

  </div>
</section>

## Configure with attributes

<section class="columns">
  <div>

`<combo-box>` can be configured with attributed in plain HTML.

```html
<combo-box name="HTML"></combo-box>
```

  </div>
  <div>

<combo-box name="HTML"></combo-box>

  </div>
</section>

## Declarative rendering

<section class="columns">
  <div>

`<combo-box>` can be used with declarative rendering libraries like Angular, React, Vue, and lit-html

```js
import {html, render} from 'lit-html';

const name = 'lit-html';

render(
  html`
    <h2>This is a &lt;combo-box&gt;</h2>
    <combo-box .name=${name}></combo-box>
  `,
  document.body
);
```

  </div>
  <div>

<h2>This is a &lt;combo-box&gt;</h2>
<combo-box name="lit-html"></combo-box>

  </div>
</section>
