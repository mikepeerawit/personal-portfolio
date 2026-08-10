import { describe, expect, it } from "vitest";
import { pageOutline, section } from "./page-outline";

describe("pageOutline", () => {
  it("lists the sections in the order they appear on the page", () => {
    expect(pageOutline.map((entry) => entry.id)).toEqual([
      "about",
      "experience",
      "projects",
      "education",
      "contact",
    ]);
  });

  it("derives every href from the section id", () => {
    for (const entry of pageOutline) {
      expect(entry.href).toBe(`#${entry.id}`);
    }
  });

  it("gives every section a label", () => {
    for (const entry of pageOutline) {
      expect(entry.label.trim()).not.toBe("");
    }
  });

  it("has no duplicate ids", () => {
    const ids = pageOutline.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("section", () => {
  it("looks up the same records the outline lists", () => {
    for (const entry of pageOutline) {
      expect(section[entry.id]).toBe(entry);
    }
  });

  it("holds nothing the outline does not list", () => {
    expect(Object.keys(section)).toHaveLength(pageOutline.length);
  });
});
