import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "cn"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
} from "@/components/ui/input-group"
import { SearchIcon, CheckIcon } from "lucide-react"
import { strings } from "@/strings";


function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot={strings.common.command}
      className={cn(
        strings.ui.flexSizeFullFlexColOverflowHiddenRoundedXl,
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = strings.ui.commandPalette,
  description = strings.ui.searchForACommandToRun,
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className={strings.common.srOnly}>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(
          strings.ui.top13TranslateY0OverflowHiddenRounded,
          className
        )}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot={strings.ui.commandInputWrapper} className={strings.ui.p1Pb0}>
      <InputGroup className={strings.ui.h8RoundedLgBorderInput30BgInput}>
        <CommandPrimitive.Input
          data-slot={strings.ui.commandInput}
          className={cn(
            strings.ui.wFullTextSmOutlineHiddenDisabledCursorNot,
            className
          )}
          {...props}
        />
        <InputGroupAddon>
          <SearchIcon className={strings.ui.size4Shrink0Opacity50} />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot={strings.ui.commandList}
      className={cn(
        strings.ui.noScrollbarMaxH72ScrollPy1Overflow,
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot={strings.ui.commandEmpty}
      className={cn(strings.ui.py6TextCenterTextSm, className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot={strings.ui.commandGroup}
      className={cn(
        strings.ui.overflowHiddenP1TextForegroundCmdkGroupHeading,
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot={strings.ui.commandSeparator}
      className={cn(strings.ui.mx1HPxBgBorder, className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot={strings.ui.commandItem}
      className={cn(
        strings.ui.groupCommandItemRelativeFlexCursorDefaultItemsCenter,
        className
      )}
      {...props}
    >
      {children}
      <CheckIcon className={strings.ui.mlAutoOpacity0GroupHasDataSlotCommand} />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot={strings.ui.commandShortcut}
      className={cn(
        strings.ui.mlAutoTextXsTrackingWidestTextMutedForeground,
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
