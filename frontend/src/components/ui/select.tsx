import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { cn } from "cn"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"
import { strings } from "@/strings";


const Select = SelectPrimitive.Root

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot={strings.ui.selectGroup}
      className={cn(strings.ui.scrollMy1P1, className)}
      {...props}
    />
  )
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot={strings.ui.selectValue}
      className={cn(strings.ui.flexFlex1TextLeft, className)}
      {...props}
    />
  )
}

function SelectTrigger({
  className,
  size = strings.ui.default,
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot={strings.ui.selectTrigger}
      data-size={size}
      className={cn(
        strings.ui.flexWFitItemsCenterJustifyBetweenGap1,
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className={strings.ui.pointerEventsNoneSize4TextMutedForeground} />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = strings.common.bottom,
  sideOffset = 4,
  align = strings.common.center,
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className={strings.ui.isolateZ50}
      >
        <SelectPrimitive.Popup
          data-slot={strings.ui.selectContent}
          data-align-trigger={alignItemWithTrigger}
          className={cn(strings.ui.relativeIsolateZ50MaxHAvailableHeightW, className )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot={strings.ui.selectLabel}
      className={cn(strings.ui.px15Py1TextXsTextMuted, className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot={strings.ui.selectItem}
      className={cn(
        strings.ui.relativeFlexWFullCursorDefaultItemsCenterGap,
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className={strings.ui.flexFlex1Shrink0Gap2WhitespaceNowrap}>
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className={strings.ui.pointerEventsNoneAbsoluteRight2FlexSize4} />
        }
      >
        <CheckIcon className={strings.ui.pointerEventsNone} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot={strings.ui.selectSeparator}
      className={cn(strings.ui.pointerEventsNoneMx1My1HPx, className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot={strings.ui.selectScrollUpButton}
      className={cn(
        strings.ui.top0Z10FlexWFullCursorDefault,
        className
      )}
      {...props}
    >
      <ChevronUpIcon
      />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot={strings.ui.selectScrollDownButton}
      className={cn(
        strings.ui.bottom0Z10FlexWFullCursorDefault,
        className
      )}
      {...props}
    >
      <ChevronDownIcon
      />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
