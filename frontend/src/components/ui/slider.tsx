import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "cn"
import { strings } from "@/strings";


function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]

  return (
    <SliderPrimitive.Root
      className={cn(strings.ui.dataHorizontalWFullDataVerticalHFull, className)}
      data-slot={strings.ui.slider}
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment={strings.ui.edge}
      {...props}
    >
      <SliderPrimitive.Control className={strings.ui.relativeFlexWFullTouchNoneItemsCenterSelect}>
        <SliderPrimitive.Track
          data-slot={strings.ui.sliderTrack}
          className={strings.ui.relativeGrowOverflowHiddenRoundedFullBgMutedSelect}
        >
          <SliderPrimitive.Indicator
            data-slot={strings.ui.sliderRange}
            className={strings.ui.bgPrimarySelectNoneDataHorizontalHFullData}
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot={strings.ui.sliderThumb}
            key={index}
            className={strings.ui.relativeBlockSize3Shrink0RoundedFullBorder}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
