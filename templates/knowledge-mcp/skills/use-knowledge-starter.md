```json
{
  "schemaVersion": 1,
  "id": "use-knowledge-starter",
  "version": "1.0.0",
  "name": "Use the knowledge starter",
  "description": "Illustrative instructions for the bundled knowledge capability. Replace through reviewed source changes.",
  "status": "approved",
  "tools": [
    "get_guidance"
  ],
  "output": {
    "kind": "guidance",
    "description": "Source-backed reference guidance."
  },
  "sources": [
    {
      "id": "starter-source",
      "title": "Wetland starter source",
      "uri": "https://github.com/mohammedahmxd/Wetland/tree/main/templates/knowledge-mcp"
    }
  ]
}
```

# Use the knowledge starter

Call get_guidance and return its released heading, guidance and package digest. Do not invent missing reference information.

This is an illustrative repository-reviewed starter skill, not organisational policy. Replace it with domain-specific reviewed instructions. A skill provides guidance only; it does not enforce workflow state, authorize actions or establish an approval. Domain-specific gates and authentication must be implemented in server code. Stop and explain tool errors rather than claim success.
