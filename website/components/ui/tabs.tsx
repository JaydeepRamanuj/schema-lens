"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "framer-motion"

import { cn } from "../../lib/utils"

const TabsContext = React.createContext<{ value?: string; onValueChange?: (value: string) => void; layoutId?: string }>({})

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ value, defaultValue, onValueChange, ...props }, ref) => {
  const [active, setActive] = React.useState(value || defaultValue)
  const id = React.useId()
  
  React.useEffect(() => {
    if (value !== undefined) setActive(value)
  }, [value])

  return (
    <TabsContext.Provider value={{ 
      value: active, 
      layoutId: id,
      onValueChange: (v) => {
        setActive(v)
        if (onValueChange) onValueChange(v)
      }
    }}>
      <TabsPrimitive.Root
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(v) => {
          setActive(v)
          if (onValueChange) onValueChange(v)
        }}
        {...props}
      />
    </TabsContext.Provider>
  )
})
Tabs.displayName = TabsPrimitive.Root.displayName

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 border border-zinc-800 p-1 text-zinc-400 relative",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, value, children, ...props }, ref) => {
  const { value: activeValue, layoutId } = React.useContext(TabsContext)
  const isActive = activeValue === value

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        "group relative inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:bg-zinc-800/50 data-[state=active]:focus-visible:bg-transparent disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-zinc-50 z-10",
        className
      )}
      {...props}
    >
      {isActive && (
        <motion.div
          layoutId={`active-tab-pill-${layoutId}`}
          className="absolute inset-0 bg-zinc-800 rounded-lg shadow group-focus-visible:ring-2 group-focus-visible:ring-zinc-700 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-zinc-950"
          initial={false}
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
          style={{ zIndex: -1 }}
        />
      )}
      {children}
    </TabsPrimitive.Trigger>
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 focus-visible:ring-offset-2 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-95 data-[state=active]:duration-200",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
