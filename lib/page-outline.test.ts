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

  it("gives every section a heading", () => {
    for (const entry of pageOutline) {
      expect(entry.heading.trim()).not.toBe("");
    }
  });

  it("falls back to the nav label for the sections that do not override it", () => {
    const headings = Object.fromEntries(
      pageOutline.map((entry) => [entry.id, entry.heading]),
    );

    expect(headings).toEqual({
      about: "About",
      experience: "Work Experience",
      projects: "Projects",
      education: "Education",
      contact: "Contact",
    });

    for (const entry of pageOutline) {
      if (entry.id === "experience") continue;
      expect(entry.heading).toBe(entry.label);
    }
  });

  it("heads Work Experience with more than the nav calls it", () => {
    const experience = pageOutline.find((entry) => entry.id === "experience");

    expect(experience?.label).toBe("Experience");
    expect(experience?.heading).toBe("Work Experience");
    // The divergence is the point: the nav stays compact while the section
    // reads in full. A future reader must not "simplify" this into one string.
    expect(experience?.heading).not.toBe(experience?.label);
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

  it("carries the heading on the looked-up record too", () => {
    expect(section.experience.heading).toBe("Work Experience");

    for (const entry of pageOutline) {
      expect(section[entry.id].heading).toBe(entry.heading);
    }
  });

  it("holds nothing the outline does not list", () => {
    expect(Object.keys(section)).toHaveLength(pageOutline.length);
  });
});
