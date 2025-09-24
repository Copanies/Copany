Run npm run lint in the current project directory using the run_terminal_cmd tool, then carefully fix all lint issues. Remove unused variables and replace any with precise types — only use unknown if the type truly cannot be determined.

Full description

Run the following command with the run_terminal_cmd tool (replace <PROJECT_PATH> with the current project path automatically, do not hardcode it):

cd <PROJECT_PATH> && npm run lint | cat

Then perform these steps: 1. Inspect the linter output and address every reported issue. 2. Apply safe auto-fixes where possible (e.g. npm run lint -- --fix), then manually resolve the rest. 3. Remove unused variables. If a variable is intentionally unused, mark it clearly (e.g., prefix with \_). 4. Replace any with concrete types. Only use unknown when it is truly impossible to determine the type, and provide narrowing/guards before usage. 5. Preserve runtime behavior and public APIs whenever possible. 6. Re-run the lint command until there are no errors. Optionally run tests and build to confirm stability. 7.Don't run npm run build.

Acceptance criteria
• npm run lint passes with no errors.
• No unused variables remain (or they’re explicitly marked).
• No any types remain (except justified unknown).
• Behavior remains unchanged.
• Changes are committed with a proper message.
