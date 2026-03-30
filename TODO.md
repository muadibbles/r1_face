# R1 Face — TODO

## Expressiveness
- [ ] Eyebrow shapes (arcs) that raise, furrow, or angle for emotion
- [ ] Squint — compress EYE_RY slightly for suspicion/thinking
- [ ] Wide eyes — brief EYE_RY expansion when startled

## Personality / Feel
- [ ] Occasional double-blink (two quick blinks back to back)
- [ ] Asymmetric blinks — one eye slightly behind the other (~20ms), feels more organic
- [ ] Tired mode — eyelids rest at ~15% closed, slower blinks

## Reactivity
- [x] Eye darts / look-around idle
- [x] Accelerometer — tilt device, eyes dart in that direction
- [ ] PTT button press triggers attentive/listening expression
- [ ] Respond to R1 state (thinking, speaking, idle) with different expressions

## Deployment
- [ ] Single-file export — inline face.js into index.html so the R1 needs no internet and no second file fetch

## Polish
- [ ] Pupils — dark iris/pupil inside each eye
- [ ] Eyelids — visible upper/lower lid shapes with thickness and color
- [ ] Mouth — simple arc or line expression that reacts to emotion
- [ ] Eyelash fringe at lid edge
- [ ] Subtle eye gloss — small white arc highlight inside eye
- [ ] Smooth ease-in/out on look transitions (instead of linear)
