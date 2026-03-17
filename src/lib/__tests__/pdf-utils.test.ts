import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const splitTextToSize = vi.fn();
  const setFontSize = vi.fn();
  const setFont = vi.fn();
  const text = vi.fn();
  const addPage = vi.fn();
  const line = vi.fn();
  const addImage = vi.fn();
  const output = vi.fn();
  const getWidth = vi.fn();
  const getHeight = vi.fn();

  const jsPDF = vi.fn(() => ({
    internal: {
      pageSize: {
        getWidth,
        getHeight,
      },
    },
    splitTextToSize,
    setFontSize,
    setFont,
    text,
    addPage,
    line,
    addImage,
    output,
  }));

  return {
    splitTextToSize,
    setFontSize,
    setFont,
    text,
    addPage,
    line,
    addImage,
    output,
    getWidth,
    getHeight,
    jsPDF,
  };
});

vi.mock("jspdf", () => ({ jsPDF: mocks.jsPDF }));
vi.mock("@/lib/date-utils", () => ({
  formatPacificLocaleDate: vi.fn(() => "03/16/2026"),
  formatPacificLocaleDateTime: vi.fn(() => "03/16/2026, 1:23 PM"),
}));
vi.mock("@/lib/constants", () => ({
  ENGAGEMENT_LETTER_TEXT: "letter body",
}));

import { generateEngagementLetterPDF } from "../pdf-utils";

describe("pdf-utils", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("generates a base64 payload and writes signature metadata", () => {
    mocks.getWidth.mockReturnValue(210);
    mocks.getHeight.mockReturnValue(297);
    mocks.splitTextToSize.mockReturnValue(["line 1", "line 2"]);
    mocks.output.mockReturnValue("data:application/pdf;base64,abc123");

    const result = generateEngagementLetterPDF("Jane Doe", "data:image/png;base64,sig");

    expect(result).toBe("abc123");
    expect(mocks.jsPDF).toHaveBeenCalledOnce();
    expect(mocks.splitTextToSize).toHaveBeenCalledWith("letter body", 170);
    expect(mocks.addImage).toHaveBeenCalledWith(
      "data:image/png;base64,sig",
      "PNG",
      20,
      expect.any(Number),
      60,
      25
    );
    expect(mocks.text).toHaveBeenCalledWith(
      expect.stringContaining("Digitally signed by Jane Doe on 03/16/2026, 1:23 PM"),
      20,
      expect.any(Number)
    );
  });

  it("adds pages when content or signature block exceeds page height", () => {
    mocks.getWidth.mockReturnValue(210);
    mocks.getHeight.mockReturnValue(90);
    mocks.splitTextToSize.mockReturnValue(Array.from({ length: 15 }, (_, i) => `line ${i}`));
    mocks.output.mockReturnValue("data:application/pdf;base64,paged");

    generateEngagementLetterPDF("Paged User", "sig");

    expect(mocks.addPage).toHaveBeenCalled();
    expect(mocks.line).toHaveBeenCalledWith(20, expect.any(Number), 190, expect.any(Number));
    expect(mocks.output).toHaveBeenCalledWith("datauristring");
  });
});
