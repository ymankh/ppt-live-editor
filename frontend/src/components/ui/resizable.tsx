import { cn } from "cn"
import * as ResizablePrimitive from "react-resizable-panels"
import { strings } from "@/strings";


function ResizablePanelGroup({
  className,
  ...props
}: ResizablePrimitive.GroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot={strings.ui.resizablePanelGroup}
      className={cn(
        strings.ui.flexHFullWFullAriaOrientationVerticalFlex,
        className
      )}
      {...props}
    />
  )
}

function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot={strings.ui.resizablePanel} {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot={strings.ui.resizableHandle}
      className={cn(
        strings.ui.relativeFlexWPxItemsCenterJustifyCenterBg,
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className={strings.ui.z10FlexH6W1Shrink0} />
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
