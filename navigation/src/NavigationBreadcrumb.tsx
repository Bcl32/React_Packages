import { Slash } from "lucide-react";
import { Link } from "react-router-dom";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@bcl32/utils/Breadcrumb";

import { useNavigation, type NavigationEntry } from "./NavigationProvider";

interface NavigationBreadcrumbProps {
  data?: unknown;
}

export default function NavigationBreadcrumb(_props: NavigationBreadcrumbProps) {
  const { navigation } = useNavigation();

  return (
    <Breadcrumb>
      <BreadcrumbList className="text-xl text-foreground">
        <BreadcrumbLink asChild>
          <Link to={"/"}>Home</Link>
        </BreadcrumbLink>

        {navigation?.map((entry) => {
          return (
            <div
              className={"inline-flex items-center gap-1.5"}
              key={"breadcrumb" + entry.type}
            >
              <BreadcrumbSeparator className="[&>svg]:size-4.5">
                <Slash />
              </BreadcrumbSeparator>

              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    to={"/" + entry.url}
                    state={{ object_id: entry.id }}
                  >
                    <LinkLabel entry={entry} />
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

interface LinkLabelProps {
  entry: NavigationEntry;
}

function LinkLabel({ entry }: LinkLabelProps) {
  if (entry.type) {
    return (
      <div className="flex flex-col">
        <span className="text-xs capitalize">{entry.type}:</span>
        <span className="capitalize">{entry.name}</span>
      </div>
    );
  } else {
    return (
      <div className="flex flex-col">
        <span className="capitalize">{entry.name}</span>
      </div>
    );
  }
}
