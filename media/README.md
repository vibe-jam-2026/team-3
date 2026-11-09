# Media: images and videos

Put screenshots, concept art, GIFs and gameplay videos here.

| Folder | For |
|---|---|
| `media/images/` | `.png`, `.jpg`, `.gif`, `.webp`, `.svg` |
| `media/videos/` | `.mp4`, `.webm` |

Everything in the repo is also published with the game, so a file here can be opened at
`https://vibe-jam-2026.github.io/team-3/media/images/<file name>` once it's merged.

**Size limits:** uploading in the browser allows up to **25 MB per file** (GitHub refuses anything over 100 MB).
Keep videos short and compressed (a 10–30 s `.mp4` clip is usually a few MB).
Use simple file names without spaces, e.g. `wave-10-alien-boss.png`.

---

## Upload in the browser (no tools needed)

We don't commit straight to `main`: changes go in on their own branch through a **pull request**, and merging it puts them in `main`.

### 1. Make a branch
1. Open https://github.com/vibe-jam-2026/team-3
2. Click the branch button (says **main**, top left above the file list)
3. Type a new branch name, e.g. `media/boss-screenshots`
4. Click **Create branch media/boss-screenshots from main**

You are now on your new branch (the button shows its name).

### 2. Upload the files
1. Click into the folder: **media** → **images** (or **videos**)
2. Click **Add file** → **Upload files**
3. Drag the files in (or click *choose your files*)
4. At the bottom, write a short message, e.g. `Add boss screenshots`
5. Make sure **Commit directly to the `media/boss-screenshots` branch** is selected
6. Click **Commit changes**

### 3. Open a pull request
1. A yellow bar appears: *media/boss-screenshots had recent pushes* → click **Compare & pull request**
   (or go to the **Pull requests** tab → **New pull request**, base: `main`, compare: your branch)
2. Give it a title, e.g. `Add boss screenshots`
3. Click **Create pull request**
4. When it looks right, click **Merge pull request** → **Confirm merge**

Done: the files are in `main`. Optionally click **Delete branch** afterwards.

---

## Upload with git (command line)

```bash
git checkout main
git pull
git checkout -b media/boss-screenshots
cp ~/Desktop/alien.png media/images/
git add media/images/alien.png
git commit -m "Add alien boss screenshot"
git push -u origin media/boss-screenshots
```

Then open the pull request on GitHub (step 3 above), or with the GitHub CLI:

```bash
gh pr create --base main --title "Add alien boss screenshot" --body "Screenshot of the alien boss"
```

---

## Ask Claude

If you can attach the files in the Claude session, you can also ask Claude to add them to `media/` and open a pull request for you.

## Using an image in a document

In any `.md` file in the repo (paths are relative to that file):

```markdown
![Alien boss](media/images/wave-10-alien-boss.png)
```
