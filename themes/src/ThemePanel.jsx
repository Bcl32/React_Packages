import React from "react";
import { useTheme } from "@bcl32/themes/ThemeProvider";

//ui components
import { Card } from "@bcl32/utils/Card";

export function ThemePanel({ name, styles }) {
  const { setTheme } = useTheme();

  return (
    <div
      className="duration-300 
          ease-in-out
          hover:scale-105 
          hover:shadow-xl "
      style={{
        backgroundColor: styles["background"],
        borderColor: styles["border"],
      }}
      onClick={() => setTheme(name)}
    >
      <div className="text-center" style={{ color: styles["foreground"] }}>
        <p className="text-md capitalize font-medium">{name}</p>
      </div>

      <Card
        key={name}
        className={`
          p-4 
          mx-4
          my-1
          flex 
          flex-col 
          items-center 
          justify-center 
        `}
        style={{ backgroundColor: styles["card"] }}
      >
        <div className="row">
          <div style={{ background: styles["primary"] }}>
            <p style={{ color: styles["primary-foreground"] }}>Primary</p>
          </div>
          <div style={{ background: styles["secondary"] }}>
            <p style={{ color: styles["secondary-foreground"] }}>Secondary</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
