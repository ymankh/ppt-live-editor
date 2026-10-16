import type { Animation, Slide } from '@/types/model';
import { strings } from "@/strings";


export interface AnimationStep { elementId: string; animation: Animation; offset: number }
export function animationGroups(slide: Slide): AnimationStep[][] {
  let current: AnimationStep[] = [];
  const groups: AnimationStep[][] = [current];
  let previousStart = 0; let previousEnd = 0;
  for (const element of slide.elements) for (const animation of element.animations) {
    if (element.hidden) continue;
    if (animation.trigger === strings.common.onClick) { current = []; groups.push(current); previousStart = 0; previousEnd = 0; }
    const offset = (animation.trigger === strings.common.afterPrevious ? previousEnd : previousStart) + animation.delay;
    current.push({ elementId: element.id, animation, offset });
    previousStart = offset; previousEnd = offset + animation.duration;
  }
  return groups;
}
export function animateStep(node: HTMLElement, animation: Animation, offset: number): globalThis.Animation {
  const effect = animation.effect;
  const exit = animation.category === strings.common.exit;
  const opacity = Number.parseFloat(node.style.opacity || strings.common.value1);
  let frames: Keyframe[];
  if (effect === strings.common.pulse) frames = [{ scale: strings.common.value1 }, { scale: strings.presenter.value112 }, { scale: strings.common.value1 }];
  else if (effect === strings.common.shake || effect === strings.common.wobble) frames = [{ translate: strings.common.value0 }, { translate: strings.presenter.value22px }, { translate: strings.presenter.value22px_5d6c4397 }, { translate: strings.presenter.value12px }, { translate: strings.common.value0 }];
  else if (effect === strings.common.swing) frames = [{ rotate: strings.presenter.value0deg }, { rotate: strings.presenter.value12deg }, { rotate: strings.presenter.value12deg_9a7235e3 }, { rotate: strings.presenter.value0deg }];
  else if (effect === strings.common.flash) frames = [{ opacity }, { opacity: 0 }, { opacity }, { opacity: 0 }, { opacity }];
  else {
    const start: Keyframe = { opacity: 0 };
    if (effect.startsWith(strings.presenter.fly)) start.translate = effect.includes(strings.presenter.top) ? strings.presenter.value0120px : effect.includes(strings.presenter.bottom) ? strings.presenter.value0120px_1dc4a07d : effect.includes(strings.presenter.left) ? strings.presenter.value120px0 : strings.presenter.value120px0_5eddc8d4;
    if (effect.startsWith(strings.common.zoom) || effect === strings.common.bounceIn) start.scale = strings.presenter.value03;
    if (effect === strings.common.rotateIn) start.rotate = strings.presenter.value90deg;
    const end: Keyframe = { opacity, translate: strings.presenter.value00, scale: strings.common.value1, rotate: strings.presenter.value0deg };
    frames = exit ? [end, start] : [start, end];
  }
  return node.animate(frames, { duration: animation.duration * 1000, delay: offset * 1000,
    fill: strings.common.both, easing: effect === strings.common.bounceIn ? strings.presenter.cubicBezier34156641 : strings.presenter.easeOut });
}
export const transitionFrames: Record<Slide['transition']['effect'], Keyframe[]> = {
  none: [], fade: [{ opacity: 0 }, { opacity: 1 }],
  slideLeft: [{ translate: strings.presenter.value1000_41249f35 }, { translate: strings.presenter.value00 }], slideRight: [{ translate: strings.presenter.value1000 }, { translate: strings.presenter.value00 }],
  push: [{ translate: strings.presenter.value0100 }, { translate: strings.presenter.value00 }], zoom: [{ scale: strings.presenter.value07, opacity: 0 }, { scale: strings.common.value1, opacity: 1 }],
  flip: [{ transform: strings.presenter.perspective1600pxRotateY90deg }, { transform: strings.presenter.perspective1600pxRotateY0deg }],
  cube: [{ transform: strings.presenter.perspective1600pxRotateY70degTranslateZ300px, opacity: 0 }, { transform: strings.presenter.perspective1600pxRotateY0TranslateZ0, opacity: 1 }],
};
