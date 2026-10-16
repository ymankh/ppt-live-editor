"use client"

import * as React from "react"
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu"
import { cn } from "cn"
import { ChevronRightIcon, CheckIcon } from "lucide-react"
import { strings } from "@/strings";


function ContextMenu({ ...props }: ContextMenuPrimitive.Root.Props) {
  return <ContextMenuPrimitive.Root data-slot={strings.ui.contextMenu} {...props} />
}

function ContextMenuPortal({ ...props }: ContextMenuPrimitive.Portal.Props) {
  return (
    <ContextMenuPrimitive.Portal data-slot={strings.ui.contextMenuPortal} {...props} />
  )
}

function ContextMenuTrigger({
  className,
  ...props
}: ContextMenuPrimitive.Trigger.Props) {
  return (
    <ContextMenuPrimitive.Trigger
      data-slot={strings.ui.contextMenuTrigger}
      className={cn(strings.ui.selectNone, className)}
      {...props}
    />
  )
}

function ContextMenuContent({
  className,
  align = strings.common.start,
  alignOffset = 4,
  side = strings.common.right,
  sideOffset = 0,
  ...props
}: ContextMenuPrimitive.Popup.Props &
  Pick<
    ContextMenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner
        className={strings.ui.isolateZ50OutlineNone}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <ContextMenuPrimitive.Popup
          data-slot={strings.ui.contextMenuContent}
          className={cn(strings.ui.z50MaxHAvailableHeightMinW36, className )}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  )
}

function ContextMenuGroup({ ...props }: ContextMenuPrimitive.Group.Props) {
  return (
    <ContextMenuPrimitive.Group data-slot={strings.ui.contextMenuGroup} {...props} />
  )
}

function ContextMenuLabel({
  className,
  inset,
  ...props
}: ContextMenuPrimitive.GroupLabel.Props & {
  inset?: boolean
}) {
  return (
    <ContextMenuPrimitive.GroupLabel
      data-slot={strings.ui.contextMenuLabel}
      data-inset={inset}
      className={cn(
        strings.ui.px15Py1TextXsFontMedium,
        className
      )}
      {...props}
    />
  )
}

function ContextMenuItem({
  className,
  inset,
  variant = strings.ui.default,
  ...props
}: ContextMenuPrimitive.Item.Props & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <ContextMenuPrimitive.Item
      data-slot={strings.ui.contextMenuItem}
      data-inset={inset}
      data-variant={variant}
      className={cn(
        strings.ui.groupContextMenuItemRelativeFlexCursorDefaultItems,
        className
      )}
      {...props}
    />
  )
}

function ContextMenuSub({ ...props }: ContextMenuPrimitive.SubmenuRoot.Props) {
  return (
    <ContextMenuPrimitive.SubmenuRoot data-slot={strings.ui.contextMenuSub} {...props} />
  )
}

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: ContextMenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean
}) {
  return (
    <ContextMenuPrimitive.SubmenuTrigger
      data-slot={strings.ui.contextMenuSubTrigger}
      data-inset={inset}
      className={cn(
        strings.ui.flexCursorDefaultItemsCenterGap15Rounded,
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className={strings.ui.mlAuto} />
    </ContextMenuPrimitive.SubmenuTrigger>
  )
}

function ContextMenuSubContent({
  ...props
}: React.ComponentProps<typeof ContextMenuContent>) {
  return (
    <ContextMenuContent
      data-slot={strings.ui.contextMenuSubContent}
      className={strings.ui.shadowLg}
      side={strings.common.right}
      {...props}
    />
  )
}

function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: ContextMenuPrimitive.CheckboxItem.Props & {
  inset?: boolean
}) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot={strings.ui.contextMenuCheckboxItem}
      data-inset={inset}
      className={cn(
        strings.ui.relativeFlexCursorDefaultItemsCenterGap15_ffe44067,
        className
      )}
      checked={checked}
      {...props}
    >
      <span className={strings.ui.pointerEventsNoneAbsoluteRight2}>
        <ContextMenuPrimitive.CheckboxItemIndicator>
          <CheckIcon
          />
        </ContextMenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  )
}

function ContextMenuRadioGroup({
  ...props
}: ContextMenuPrimitive.RadioGroup.Props) {
  return (
    <ContextMenuPrimitive.RadioGroup
      data-slot={strings.ui.contextMenuRadioGroup}
      {...props}
    />
  )
}

function ContextMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: ContextMenuPrimitive.RadioItem.Props & {
  inset?: boolean
}) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot={strings.ui.contextMenuRadioItem}
      data-inset={inset}
      className={cn(
        strings.ui.relativeFlexCursorDefaultItemsCenterGap15_ffe44067,
        className
      )}
      {...props}
    >
      <span className={strings.ui.pointerEventsNoneAbsoluteRight2}>
        <ContextMenuPrimitive.RadioItemIndicator>
          <CheckIcon
          />
        </ContextMenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  )
}

function ContextMenuSeparator({
  className,
  ...props
}: ContextMenuPrimitive.Separator.Props) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot={strings.ui.contextMenuSeparator}
      className={cn(strings.ui.mx1My1HPxBgBorder, className)}
      {...props}
    />
  )
}

function ContextMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot={strings.ui.contextMenuShortcut}
      className={cn(
        strings.ui.mlAutoTextXsTrackingWidestTextMutedForeground_f11c335f,
        className
      )}
      {...props}
    />
  )
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}
