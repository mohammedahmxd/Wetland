# Repository-reviewed MCP skills

A skill is a versioned Markdown instruction file that explains how an agent should use existing MCP tools. It is not executable code, an access grant, a substitute for a server gate, or a claim that a task already succeeded. This zero-dependency loader never fetches links, follows includes, imports code, or executes Markdown.

Store files in a service's `skills/` directory. Each file begins with exactly one JSON metadata fence, followed by instructions:

````markdown
```json
{
  "schemaVersion": 1,
  "id": "sample-skill",
  "version": "1.0.0",
  "name": "Sample skill",
  "description": "A short discovery description.",
  "status": "approved",
  "tools": ["existing_tool"],
  "output": {"kind": "draft", "description": "Cited draft material."},
  "sources": [{"id": "source-one", "title": "Released guidance", "uri": "wetland://example/guidance"}]
}
```

# Steps

Call the named tool. Inspect its returned evidence. Stop if a required prerequisite fails.
````

`approved` means the bundled file has passed the repository's review/release process. The loader cannot independently prove that human review took place. Changing a public upload's status field must never grant approval: the authenticated authoring/release layer must enforce that separately. Draft files are validated but not served. Source links are citations, never fetched by this package.

## API

```js
import {loadSkills,validateSkillFiles,parseSkill,findSkills,getSkill} from '@wetland/mcp-skills';
const skills = await loadSkills(serviceRoot, {allowedTools: ['existing_tool']});
const matches = findSkills(skills, {query: 'draft'});
const skill = getSkill(skills, {id: 'sample-skill', version: '1.0.0'});
```

- `loadSkills(root, {allowedTools})` reads `root/skills/*.md`. Missing directory returns an empty catalogue. Non-files, symlinks, unsafe names, invalid UTF-8 and oversized files are rejected. At most 128 files of 64 KiB each are accepted.
- `parseSkill(markdown, {allowedTools, filename?})` validates one file and returns its record, including draft status.
- `validateSkillFiles([{filename,markdown}], {allowedTools})` validates an in-memory candidate set and returns approved records only. Duplicate filename or ID/version pairs are rejected.
- `findSkills(skills, {query})` returns short metadata summaries without instruction bodies. All query words must match identity/name/description/tool text.
- `getSkill(skills, {id, version?})` returns an approved record. Omit version for the highest numeric semantic version. Unknown/draft versions fail. Records are returned as copies.

Full records contain the metadata fields above plus `digest` (lowercase SHA-256 of the **entire original file**), `instructions` and its `markdown` alias (body only), and `source: {file, approval}`. Summaries omit status and instruction bodies. Versions must be strict numeric `major.minor.patch`. Digest changes on any metadata/body/line-ending edit, even if the author forgets to bump version; release policy should require a version increment. A workflow can pin `{id,version,digest}` to reject changed instructions.

Allowed tool dependencies are validated against a service-owned list, never a list supplied by an end user. For scoped MCPs filter approved records to those whose tool dependencies are entirely inside the scope. Do not expose skill body retrieval merely because an ID was guessed.

The separate `./workflow` export is implemented by the workflow engine module. Run all package tests with `npm test`; catalogue-only tests are `node --test skills.test.mjs`.
