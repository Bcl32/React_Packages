// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Legend } from "./Legend";
import { Meter, ScoreMeter } from "./ScoreMeter";
import { SegmentedBar } from "./SegmentedBar";
import { Spark } from "./Spark";
import { StatTile } from "./StatTile";
import { TableTwin } from "./TableTwin";
import { VizStyles } from "./VizStyles";

afterEach(cleanup);

describe("ScoreMeter", () => {
  it("is a meter with aria-valuenow and prints the band's label", () => {
    render(<ScoreMeter score={62} label="Health score" />);
    const meter = screen.getByRole("meter", { name: "Health score" });
    expect(meter.getAttribute("aria-valuenow")).toBe("62");
    expect(meter.getAttribute("aria-valuemax")).toBe("100");
    expect(meter.getAttribute("aria-valuetext")).toBe("62 of 100, Needs work");
    expect(screen.getByText("Needs work")).toBeTruthy();
  });

  it("says so in words when there is no score", () => {
    render(<ScoreMeter score={null} label="Health score" />);
    expect(screen.getAllByText("No score yet").length).toBeGreaterThan(0);
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBeNull();
  });
});

describe("Meter as a progress bar", () => {
  it("carries no aria-valuemax while the total is still growing", () => {
    render(<Meter role="progressbar" value={1240} max={3000} exact={false} label="Crawl progress" valueText="1,240 of about 3,000" />);
    const bar = screen.getByRole("progressbar", { name: "Crawl progress" });
    expect(bar.getAttribute("aria-valuemax")).toBeNull();
    expect(bar.getAttribute("aria-valuenow")).toBeNull();
    expect(bar.getAttribute("aria-valuetext")).toBe("1,240 of about 3,000");
  });

  it("carries the full value range once the total is exact", () => {
    render(<Meter role="progressbar" value={30} max={120} label="Done" />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("30");
    expect(bar.getAttribute("aria-valuemax")).toBe("120");
  });
});

describe("SegmentedBar", () => {
  const parts = [
    { key: "2xx", label: "2xx", value: 900, tone: "good" as const },
    { key: "4xx", label: "4xx", value: 95, tone: "serious" as const },
    { key: "5xx", label: "5xx", value: 5, tone: "critical" as const },
  ];

  it("names every part with its amount and share", () => {
    render(<SegmentedBar parts={parts} title="Status codes" assumeWidth={600} />);
    const group = screen.getByRole("group");
    expect(group.getAttribute("aria-label")).toBe("Status codes: 2xx 900 (90%), 4xx 95 (10%), 5xx 5 (1%)");
  });

  it("prints a value inside a wide block and none inside a narrow one", () => {
    const { container } = render(<SegmentedBar parts={parts} title="Status codes" assumeWidth={600} legend={false} />);
    expect(container.querySelector('[data-part="2xx"]')!.textContent).toBe("900");
    expect(container.querySelector('[data-part="5xx"]')!.textContent).toBe("");
  });

  it("draws an icon beside every toned legend entry", () => {
    const { container } = render(<SegmentedBar parts={parts} title="Status codes" />);
    expect(container.querySelectorAll("li svg[data-tone]")).toHaveLength(3);
  });

  it("thin bars print no text", () => {
    const { container } = render(<SegmentedBar parts={parts} title="Status codes" variant="thin" legend={false} />);
    expect(container.textContent).toBe("");
  });

  it("says no data rather than drawing an empty bar", () => {
    render(<SegmentedBar parts={[{ key: "a", label: "a", value: 0 }]} title="Empty" />);
    expect(screen.getByText("Nothing recorded.")).toBeTruthy();
  });
});

describe("StatTile", () => {
  it("compacts the figure and colours a bad delta with its sign", () => {
    const { container } = render(
      <StatTile label="Errors" value={12_900} delta={{ value: 5, vs: "previous crawl", goodWhen: "down" }} trend={[1, 2, 3]} />,
    );
    expect(screen.getByText("12.9K")).toBeTruthy();
    expect(container.querySelector('[data-delta="bad"]')!.textContent).toContain("+5");
    expect(container.textContent).toContain("vs previous crawl");
    expect(screen.getByRole("img", { name: "Errors, last 3 runs" })).toBeTruthy();
  });
});

describe("Spark", () => {
  it("says empty in words", () => {
    render(<Spark data={[]} label="Errors" empty="No crawls yet" />);
    expect(screen.getByText("No crawls yet")).toBeTruthy();
  });
});

describe("Legend", () => {
  it("draws swatches for identities and icons for states", () => {
    const { container } = render(<Legend items={[{ label: "Pages", slot: 1 }, { label: "Errors", tone: "critical" }]} />);
    expect(container.querySelectorAll("svg[data-tone]")).toHaveLength(1);
    expect(container.querySelectorAll("span[aria-hidden]")).toHaveLength(1);
  });
});

describe("TableTwin", () => {
  it("renders the chart's rows with a caption", () => {
    render(
      <TableTwin
        caption="Status codes, last crawl"
        collapsible={false}
        columns={[
          { key: "label", label: "Class" },
          { key: "value", label: "Pages", numeric: true },
        ]}
        rows={[
          { label: "2xx", value: 1200 },
          { label: "4xx", value: 3 },
        ]}
      />,
    );
    expect(screen.getByRole("table", { name: "Status codes, last crawl" })).toBeTruthy();
    expect(screen.getByText("1,200")).toBeTruthy();
  });
});

describe("VizStyles", () => {
  it("stamps the scheme on <html> and removes it on unmount", () => {
    const { unmount } = render(<VizStyles scheme="dark" />);
    expect(document.documentElement.getAttribute("data-viz-scheme")).toBe("dark");
    unmount();
    expect(document.documentElement.getAttribute("data-viz-scheme")).toBeNull();
  });
});
