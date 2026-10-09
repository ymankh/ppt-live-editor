import type { Animation, Slide } from '@/types/model';

export interface AnimationStep { elementId: string; animation: Animation; offset: number }
export function animationGroups(slide: Slide): AnimationStep[][] {
  let current: AnimationStep[] = [];
  const groups: AnimationStep[][] = [current];
  let previousStart = 0; let previousEnd = 0;
  for (const element of slide.elements) for (const animation of element.animations) {
    if (element.hidden) continue;
    if (animation.trigger === 'onClick') { current = []; groups.push(current); previousStart = 0; previousEnd = 0; }
    const offset = (animation.trigger === 'afterPrevious' ? previousEnd : previousStart) + animation.delay;
    current.push({ elementId: element.id, animation, offset });
    previousStart = offset; previousEnd = offset + animation.duration;
  }
  return groups;
}
export function animateStep(node: HTMLElement, animation: Animation, offset: number): globalThis.Animation {
  const effect = animation.effect;
  const exit = animation.category === 'exit';
  const opacity = Number.parseFloat(node.style.opacity || '1');
  let frames: Keyframe[];
  if (effect === 'pulse') frames = [{ scale: '1' }, { scale: '1.12' }, { scale: '1' }];
  else if (effect === 'shake' || effect === 'wobble') frames = [{ translate: '0' }, { translate: '-22px' }, { translate: '22px' }, { translate: '-12px' }, { translate: '0' }];
  else if (effect === 'swing') frames = [{ rotate: '0deg' }, { rotate: '-12deg' }, { rotate: '12deg' }, { rotate: '0deg' }];
  else if (effect === 'flash') frames = [{ opacity }, { opacity: 0 }, { opacity }, { opacity: 0 }, { opacity }];
  else {
    const start: Keyframe = { opacity: 0 };
    if (effect.startsWith('fly')) start.translate = effect.includes('Top') ? '0 -120px' : effect.includes('Bottom') ? '0 120px' : effect.includes('Left') ? '-120px 0' : '120px 0';
    if (effect.startsWith('zoom') || effect === 'bounceIn') start.scale = '0.3';
    if (effect === 'rotateIn') start.rotate = '-90deg';
    const end: Keyframe = { opacity, translate: '0 0', scale: '1', rotate: '0deg' };
    frames = exit ? [end, start] : [start, end];
  }
  return node.animate(frames, { duration: animation.duration * 1000, delay: offset * 1000,
    fill: 'both', easing: effect === 'bounceIn' ? 'cubic-bezier(.34,1.56,.64,1)' : 'ease-out' });
}
export const transitionFrames: Record<Slide['transition']['effect'], Keyframe[]> = {
  none: [], fade: [{ opacity: 0 }, { opacity: 1 }],
  slideLeft: [{ translate: '100% 0' }, { translate: '0 0' }], slideRight: [{ translate: '-100% 0' }, { translate: '0 0' }],
  push: [{ translate: '0 100%' }, { translate: '0 0' }], zoom: [{ scale: '0.7', opacity: 0 }, { scale: '1', opacity: 1 }],
  flip: [{ transform: 'perspective(1600px) rotateY(90deg)' }, { transform: 'perspective(1600px) rotateY(0deg)' }],
  cube: [{ transform: 'perspective(1600px) rotateY(-70deg) translateZ(-300px)', opacity: 0 }, { transform: 'perspective(1600px) rotateY(0) translateZ(0)', opacity: 1 }],
};
