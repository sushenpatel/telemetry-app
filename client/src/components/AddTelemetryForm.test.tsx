import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CreateTelemetryPayload } from "../types";
import { AddTelemetryForm } from "./AddTelemetryForm";

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText("SAT-07"), "SAT-42");
  await user.type(screen.getByPlaceholderText("550.2"), "550.2");
  await user.type(screen.getByPlaceholderText("7.66"), "7.66");

  // datetime-local inputs use a segmented native widget that userEvent.type doesn't
  // drive reliably in jsdom, so we set the value directly via a change event instead.
  const timestampInput = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
  fireEvent.change(timestampInput, { target: { value: "2026-07-05T10:00:00" } });

  await user.selectOptions(screen.getByDisplayValue("Select status"), "healthy");
}

describe("AddTelemetryForm", () => {
  it("shows validation errors and does not submit when the form is empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<AddTelemetryForm onSubmit={onSubmit} isSubmitting={false} />);
    await user.click(screen.getByRole("button", { name: /log entry/i }));

    expect(await screen.findByText("Satellite ID is required.")).toBeInTheDocument();
    expect(screen.getByText("Timestamp is required.")).toBeInTheDocument();
    expect(screen.getByText("Altitude is required.")).toBeInTheDocument();
    expect(screen.getByText("Velocity is required.")).toBeInTheDocument();
    expect(screen.getByText("Select a health status.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects negative altitude and velocity", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<AddTelemetryForm onSubmit={onSubmit} isSubmitting={false} />);
    await user.type(screen.getByPlaceholderText("550.2"), "-5");
    await user.type(screen.getByPlaceholderText("7.66"), "-1");
    await user.click(screen.getByRole("button", { name: /log entry/i }));

    expect(await screen.findByText("Altitude cannot be negative.")).toBeInTheDocument();
    expect(screen.getByText("Velocity cannot be negative.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a well-formed payload and resets the form on success", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ ok: true });

    render(<AddTelemetryForm onSubmit={onSubmit} isSubmitting={false} />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /log entry/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0] as CreateTelemetryPayload;
    expect(payload.satelliteId).toBe("SAT-42");
    expect(payload.altitude).toBe(550.2);
    expect(payload.velocity).toBe(7.66);
    expect(payload.status).toBe("healthy");
    // Confirms the datetime-local value was converted to a full ISO 8601 string.
    expect(payload.timestamp).toBe(new Date("2026-07-05T10:00:00").toISOString());

    expect(await screen.findByText("Entry logged.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("SAT-07")).toHaveValue("");
  });

  it("surfaces a server-provided error message without clearing the form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, message: "Satellite ID already exists" });

    render(<AddTelemetryForm onSubmit={onSubmit} isSubmitting={false} />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /log entry/i }));

    expect(await screen.findByText("Satellite ID already exists")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("SAT-07")).toHaveValue("SAT-42");
  });

  it("disables the submit button and shows a busy label while submitting", () => {
    render(<AddTelemetryForm onSubmit={vi.fn()} isSubmitting={true} />);
    const button = screen.getByRole("button", { name: /logging/i });
    expect(button).toBeDisabled();
  });
});
