"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { Menubar as MenubarPrimitive } from "@base-ui/react/menubar"
import { cn } from "cn"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CheckIcon } from "lucide-react"
import { strings } from "@/strings";


function Menubar({ className, ...props }: MenubarPrimitive.Props) {
  return (
    <MenubarPrimitive
      data-slot={strings.ui.menubar}
      className={cn(
        strings.ui.flexH8ItemsCenterGap05Rounded,
        className
      )}
      {...props}
    />
  )
}

function MenubarMenu({ ...props }: React.ComponentProps<typeof DropdownMenu>) {
  return <DropdownMenu data-slot={strings.ui.menubarMenu} {...props} />
}

function MenubarGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuGroup>) {
  return <DropdownMenuGroup data-slot={strings.ui.menubarGroup} {...props} />
}

function MenubarPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPortal>) {
  return <DropdownMenuPortal data-slot={strings.ui.menubarPortal} {...props} />
}

function MenubarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuTrigger>) {
  return (
    <DropdownMenuTrigger
      data-slot={strings.ui.menubarTrigger}
      className={cn(
        strings.ui.flexItemsCenterRoundedSmPx15Py,
        className
      )}
      {...props}
    />
  )
}

function MenubarContent({
  className,
  align = strings.common.start,
  alignOffset = -4,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot={strings.ui.menubarContent}
      align={align}
      alignOffset={alignOffset}
      sideOffset={sideOffset}
      className={cn(strings.ui.minW36RoundedLgBgPopoverP1, className )}
      {...props}
    />
  )
}

function MenubarItem({
  className,
  inset,
  variant = strings.ui.default,
  ...props
}: React.ComponentProps<typeof DropdownMenuItem>) {
  return (
    <DropdownMenuItem
      data-slot={strings.ui.menubarItem}
      data-inset={inset}
      data-variant={variant}
      className={cn(
        strings.ui.groupMenubarItemGap15RoundedMdPx,
        className
      )}
      {...props}
    />
  )
}

function MenubarCheckboxItem({
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
      data-slot={strings.ui.menubarCheckboxItem}
      data-inset={inset}
      className={cn(
        strings.ui.relativeFlexCursorDefaultItemsCenterGap15,
        className
      )}
      checked={checked}
      {...props}
    >
      <span className={strings.ui.pointerEventsNoneAbsoluteLeft15FlexSize}>
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon
          />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function MenubarRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuRadioGroup>) {
  return <DropdownMenuRadioGroup data-slot={strings.ui.menubarRadioGroup} {...props} />
}

function MenubarRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot={strings.ui.menubarRadioItem}
      data-inset={inset}
      className={cn(
        strings.ui.relativeFlexCursorDefaultItemsCenterGap15_e7b52e48,
        className
      )}
      {...props}
    >
      <span className={strings.ui.pointerEventsNoneAbsoluteLeft15FlexSize}>
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon
          />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuLabel> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuLabel
      data-slot={strings.ui.menubarLabel}
      data-inset={inset}
      className={cn(
        strings.ui.px15Py1TextSmFontMedium,
        className
      )}
      {...props}
    />
  )
}

function MenubarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSeparator>) {
  return (
    <DropdownMenuSeparator
      data-slot={strings.ui.menubarSeparator}
      className={cn(strings.ui.mx1My1HPxBgBorder, className)}
      {...props}
    />
  )
}

function MenubarShortcut({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuShortcut>) {
  return (
    <DropdownMenuShortcut
      data-slot={strings.ui.menubarShortcut}
      className={cn(
        strings.ui.mlAutoTextXsTrackingWidestTextMutedForeground_18e80206,
        className
      )}
      {...props}
    />
  )
}

function MenubarSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuSub>) {
  return <DropdownMenuSub data-slot={strings.ui.menubarSub} {...props} />
}

function MenubarSubTrigger({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuSubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuSubTrigger
      data-slot={strings.ui.menubarSubTrigger}
      data-inset={inset}
      className={cn(
        strings.ui.gap15RoundedMdPx15Py,
        className
      )}
      {...props}
    />
  )
}

function MenubarSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSubContent>) {
  return (
    <DropdownMenuSubContent
      data-slot={strings.ui.menubarSubContent}
      className={cn(strings.ui.minW32RoundedLgBgPopoverP1, className )}
      {...props}
    />
  )
}

export {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
}
