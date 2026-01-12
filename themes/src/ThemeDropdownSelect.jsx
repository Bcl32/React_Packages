import { Button } from "@bcl32/utils/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@bcl32/utils/Dropdown";

import { useTheme } from "./ThemeProvider";

export function ThemeDropdownSelect() {
  const { setTheme, theme_options } = useTheme();

  var dropdown_items = theme_options.map((entry) => {
    return (
      <DropdownMenuItem key={entry} onClick={() => setTheme(entry)}>
        {entry}
      </DropdownMenuItem>
    );
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default">
          <span>Change Theme</span>
          <span className="sr-only">Change Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{dropdown_items}</DropdownMenuContent>
    </DropdownMenu>
  );
}
