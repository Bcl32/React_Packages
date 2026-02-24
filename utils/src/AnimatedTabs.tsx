import * as React from "react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import clsx from "clsx";

export const TabContent = TabPanel;

interface AnimatedTabsProps {
  tab_titles: string[];
  children: React.ReactNode;
  theme_type?: "dark" | "light";
  size?: "sm" | "lg";
}

export function AnimatedTabs({
  tab_titles,
  children,
  theme_type = "dark",
  size = "sm",
}: AnimatedTabsProps) {
  const test = tab_titles[0] + tab_titles[1]; //unique value for layoutid
  const motion_style = clsx("colouring", {
    "absolute inset-0 z-10": true,
    "bg-primary/80 mix-blend-screen": theme_type === "dark",
    "bg-primary/70 mix-blend-multiply": theme_type === "light",
  });
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="flex space-x-1">
      <TabGroup>
        <TabList>
          {tab_titles.map((label, index) => (
            <Tab
              key={index}
              onClick={() => setActiveTab(index)}
              className={`${
                activeTab === index ? "" : "hover:text-foreground/60"
              } relative rounded-full ${size === "lg" ? "px-4 py-2 text-lg" : "px-3 py-1.5 text-sm"} font-medium text-foreground outline-sky-400 transition focus-visible:outline-2`}
              style={{
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {activeTab === index && (
                <motion.span
                  layoutId={test} //unique value for this component to not interfere with other animated tab instances
                  className={motion_style}
                  style={{ borderRadius: 9999 }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
                />
              )}
              <span>{label}</span>
            </Tab>
          ))}
        </TabList>
        <TabPanels>{children}</TabPanels>
      </TabGroup>
    </div>
  );
}
