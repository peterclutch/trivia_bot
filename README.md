# Slack Trivia Bot
Quick and dirty implementation of a Slack bot that can run a trivia game. Messy AI generated slop—my attempt at vibe coding using [ChatGPT's codex](https://chatgpt.com/codex) 8-).

## Schedule

- **Monday** – generate trivia questions for the entire work week based on the current theme
- **Monday-Friday** - ask question in trivia channel
- **Tuesday–Saturday** – reveal yesterday's answer
- **Saturday** – announce the weekly winner.

## Commands

- `/theme [new theme]` – set or show the trivia theme
- `/lie <1|2|3>` – submit today's answer
- `/reveal` – show today's correct answer
- `/winners` – list previous weekly winners and the theme they won with
