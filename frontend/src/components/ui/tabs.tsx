"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { strings } from "@/strings";


function Tabs({
  className,
  orientation = strings.common.horizontal,
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot={strings.ui.tabs}
      data-orientation={orientation}
      className={cn(
        strings.ui.groupTabsFlexGap2DataHorizontalFlexCol,
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  strings.ui.groupTabsListInlineFlexWFitItemsCenter,
  {
    variants: {
      variant: {
        default: strings.ui.bgMuted,
        line: strings.ui.gap1BgTransparent,
      },
    },
    defaultVariants: {
      variant: strings.ui.default,
    },
  }
)

function TabsList({
  className,
  variant = strings.ui.default,
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot={strings.ui.tabsList}
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot={strings.ui.tabsTrigger}
      className={cn(
        strings.ui.relativeInlineFlexHCalc1001pxFlex1,
        strings.ui.groupDataVariantLineTabsListBgTransparentGroup,
        strings.ui.dataActiveBgBackgroundDataActiveTextForegroundDark,
        strings.ui.afterAbsoluteAfterBgForegroundAfterOpacity0After,
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot={strings.ui.tabsContent}
      className={cn(strings.ui.flex1TextSmOutlineNone, className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
