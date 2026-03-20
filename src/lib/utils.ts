import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import React from "react";
import { 
  User, Network, Eye, PenTool, ShieldCheck, Code, Bot, TerminalSquare 
} from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const IconRegistry: Record<string, React.ElementType> = { 
  User, Network, Eye, PenTool, ShieldCheck, Code, Bot, TerminalSquare 
};

export const renderIcon = (iconName: string, size = 20, className = "") => {
  const IconComp = IconRegistry[iconName] || Bot;
  return React.createElement(IconComp, { size, className });
};