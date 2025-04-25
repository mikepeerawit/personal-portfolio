import { Project } from "../types";

export const projects: Project[] = [
  {
    title: "Weather App",
    description:
      "A responsive weather dashboard that displays current weather data and forecasts using OpenWeatherMap API. Built to practice API integration, state management, and clean UI design.",
    tags: ["React", "Tailwind", "OpenWeatherMap"],
    githubUrl: "https://github.com/mikepeerawit/weather-app",
    year: "2024",
  },
  {
    title: "Todo CLI",
    description:
      "A simple command-line tool for managing a to-do list. Supports adding, listing, completing, and removing tasks with persistent storage using JSON files.",
    tags: ["Node.js", "CLI", "JavaScript"],
    githubUrl: "https://github.com/mikepeerawit/todo-cli",
    year: "2024",
  },
  {
    title: "CLI Web Scraper",
    description:
      "A command-line web scraper that extracts and parses content from web pages. Built to automate data collection using HTTP requests and HTML parsing in Node.js.",
    tags: ["Node.js", "CLI", "Cheerio"],
    githubUrl: "https://github.com/mikepeerawit/my-cli-scraper",
    year: "2024",
  },
];
