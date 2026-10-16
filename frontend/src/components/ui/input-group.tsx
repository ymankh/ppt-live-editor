"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { strings } from "@/strings";


function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot={strings.ui.inputGroup}
      role={strings.common.group}
      className={cn(
        strings.ui.groupInputGroupRelativeFlexH8WFull,
        className
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  strings.ui.flexHAutoCursorTextItemsCenterJustifyCenter,
  {
    variants: {
      align: {
        [strings.ui.inlineStart]:
          strings.ui.orderFirstPl2HasButtonMl03rem,
        [strings.ui.inlineEnd]:
          strings.ui.orderLastPr2HasButtonMr03rem,
        [strings.ui.blockStart]:
          strings.ui.orderFirstWFullJustifyStartPx25,
        [strings.ui.blockEnd]:
          strings.ui.orderLastWFullJustifyStartPx25,
      },
    },
    defaultVariants: {
      align: strings.ui.inlineStart,
    },
  }
)

function InputGroupAddon({
  className,
  align = strings.ui.inlineStart,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role={strings.common.group}
      data-slot={strings.ui.inputGroupAddon}
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(strings.common.button)) {
          return
        }
        e.currentTarget.parentElement?.querySelector(strings.ui.input)?.focus()
      }}
      {...props}
    />
  )
}

const inputGroupButtonVariants = cva(
  strings.ui.flexItemsCenterGap2TextSmShadowNone,
  {
    variants: {
      size: {
        xs: strings.ui.h6Gap1RoundedCalcVarRadius3px,
        sm: strings.common.empty,
        [strings.common.iconXs]:
          strings.ui.size6RoundedCalcVarRadius3pxP0,
        [strings.common.iconSm]: strings.ui.size8P0HasSvgP0,
      },
    },
    defaultVariants: {
      size: strings.ui.xs,
    },
  }
)

function InputGroupButton({
  className,
  type = strings.common.button,
  variant = strings.common.ghost,
  size = strings.ui.xs,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "type"> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: "button" | "submit" | "reset"
  }) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        strings.ui.flexItemsCenterGap2TextSmTextMuted,
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot={strings.ui.inputGroupControl}
      className={cn(
        strings.ui.flex1RoundedNoneBorder0BgTransparentShadow,
        className
      )}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot={strings.ui.inputGroupControl}
      className={cn(
        strings.ui.flex1ResizeNoneRoundedNoneBorder0Bg,
        className
      )}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}
