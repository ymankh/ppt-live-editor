import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { cn } from "cn"
import { ChevronRightIcon, CheckIcon } from "lucide-react"
import { strings } from "@/strings";


function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot={strings.ui.dropdownMenu} {...props} />
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot={strings.ui.dropdownMenuPortal} {...props} />
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot={strings.ui.dropdownMenuTrigger} {...props} />
}

function DropdownMenuContent({
  align = strings.common.start,
  alignOffset = 0,
  side = strings.common.bottom,
  sideOffset = 4,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className={strings.ui.isolateZ50OutlineNone}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot={strings.ui.dropdownMenuContent}
          className={cn(strings.ui.z50MaxHAvailableHeightWAnchorWidth, className )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot={strings.ui.dropdownMenuGroup} {...props} />
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot={strings.ui.dropdownMenuLabel}
      data-inset={inset}
      className={cn(
        strings.ui.px15Py1TextXsFontMedium,
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = strings.ui.default,
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <MenuPrimitive.Item
      data-slot={strings.ui.dropdownMenuItem}
      data-inset={inset}
      data-variant={variant}
      className={cn(
        strings.ui.groupDropdownMenuItemRelativeFlexCursorDefaultItems,
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot={strings.ui.dropdownMenuSub} {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot={strings.ui.dropdownMenuSubTrigger}
      data-inset={inset}
      className={cn(
        strings.ui.flexCursorDefaultItemsCenterGap15Rounded_9341e096,
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className={strings.ui.mlAuto} />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  align = strings.common.start,
  alignOffset = -3,
  side = strings.common.right,
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot={strings.ui.dropdownMenuSubContent}
      className={cn(strings.ui.wAutoMinW96pxRoundedLgBgPopover, className )}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot={strings.ui.dropdownMenuCheckboxItem}
      data-inset={inset}
      className={cn(
        strings.ui.relativeFlexCursorDefaultItemsCenterGap15_645af9fc,
        className
      )}
      checked={checked}
      {...props}
    >
      <span
        className={strings.ui.pointerEventsNoneAbsoluteRight2FlexItemsCenter}
        data-slot={strings.ui.dropdownMenuCheckboxItemIndicator}
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon
          />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot={strings.ui.dropdownMenuRadioGroup}
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot={strings.ui.dropdownMenuRadioItem}
      data-inset={inset}
      className={cn(
        strings.ui.relativeFlexCursorDefaultItemsCenterGap15_645af9fc,
        className
      )}
      {...props}
    >
      <span
        className={strings.ui.pointerEventsNoneAbsoluteRight2FlexItemsCenter}
        data-slot={strings.ui.dropdownMenuRadioItemIndicator}
      >
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon
          />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot={strings.ui.dropdownMenuSeparator}
      className={cn(strings.ui.mx1My1HPxBgBorder, className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot={strings.ui.dropdownMenuShortcut}
      className={cn(
        strings.ui.mlAutoTextXsTrackingWidestTextMutedForeground_658c6298,
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
