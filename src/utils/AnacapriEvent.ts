export default class AnacapriEvent extends CustomEvent<unknown> {
  constructor(
    type: string,
    eventInitDict?: CustomEventInit<unknown> | undefined
  ) {
    const bubbles =
      eventInitDict?.bubbles !== undefined ? eventInitDict.bubbles : true
    const composed =
      eventInitDict?.composed !== undefined ? eventInitDict.composed : true
    const cancelable =
      eventInitDict?.cancelable !== undefined ? eventInitDict.cancelable : true
    super(type, {...eventInitDict, bubbles, cancelable, composed})
  }
}
