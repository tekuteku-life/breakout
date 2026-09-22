1. **Extract Data into JSON files**:
   - Write a Node.js script to extract `blockColor`, `blockLineColor`, `blockText`, `blockTextColor`, `blockLife`, `blockThrough`, `blockInfinit`, `blockBreakLimit`, `blockFunction`, `stageTitle`, `stageLifeUp`, and `blockMapSet` from `setup/default.js` and save them as `setup/default.json`.
   - Similarly, extract the corresponding arrays from `setup/default_debug.js` into `setup/default_debug.json`.

2. **Modify Configuration Files (`setup/default.js` and `setup/default_debug.js`)**:
   - Remove the arrays defined in step 1.
   - Add a new variable `var dataJsonPath = './setup/default.json';` (and `./setup/default_debug.json` respectively) so `src/script.js` knows which JSON file to load.

3. **Modify `src/script.js` to Load JSON Asynchronously**:
   - Change `window.onload` to `fetch(dataJsonPath)`, parse the JSON response, assign the values to the respective global variables (`blockColor`, etc.), and then call `init(0)` and other startup methods.
   - Change `changeSetting(file)` to first load the new JS config script. Once the script runs, it defines `dataJsonPath`. Then, perform a `fetch(dataJsonPath)`, populate the globals, and finally call `init(0)`.
   - Ensure variables like `var blockColor = [];` etc., are declared globally at the top of `src/script.js` since they are no longer in `default.js`.

4. **Testing and Verification**:
   - Run a local HTTP server and verify that the game loads correctly and levels are properly configured.
   - Verify that switching settings dynamically works correctly.

5. **Pre-commit Steps**:
   - Ensure proper testing, verification, review, and reflection are done.
