"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

export function NavigationMenuDemo() {
  return (
    <NavigationMenu>
      <NavigationMenuList className="flex-wrap gap-2">
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link 
              href="/home" 
              className={cn(
                navigationMenuTriggerStyle(),
                "text-lg font-bold bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
              )}
            >
              Home
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link 
              href="/about_us" 
              className={cn(
                navigationMenuTriggerStyle(),
                "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              About Us
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link 
              href="/contact_us" 
              className={cn(
                navigationMenuTriggerStyle(),
                "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              Contact Us
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

export default NavigationMenuDemo;
