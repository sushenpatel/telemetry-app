import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders the label for a known status", () => {
    render(<StatusBadge status="healthy" />);
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("renders each known health status with its own label", () => {
    const { rerender } = render(<StatusBadge status="warning" />);
    expect(screen.getByText("Warning")).toBeInTheDocument();

    rerender(<StatusBadge status="critical" />);
    expect(screen.getByText("Critical")).toBeInTheDocument();

    rerender(<StatusBadge status="unknown" />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("falls back to the Unknown style for an unrecognized status string", () => {
    render(<StatusBadge status="totally-bogus-status" />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});
