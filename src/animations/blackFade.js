import { createAnimation } from '@ionic/vue'

export const blackFadeAnimation = (baseEl, opts) => {
  const enterEl = opts.enteringEl
  const leaveEl = opts.leavingEl

  const enterAnim = createAnimation()
    .addElement(enterEl)
    .fromTo('opacity', 0, 1)
    .duration(200)

  const leaveAnim = createAnimation()
    .addElement(leaveEl)
    .fromTo('opacity', 1, 0)
    .duration(200)

  return createAnimation()
    .addAnimation([enterAnim, leaveAnim])
}