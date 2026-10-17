# Welcome to the MCP Hub

The MCP Hub is where Water Care Canada staff find **ready-made AI helpers (MCPs)** and use them in the AI assistant they already use. No coding and no setup needed.

This page explains what MCPs are, how to use one in a few minutes, and how to ask for a new one.

---

## In one minute

1. **Find** the MCP that matches your task in the **Catalogue**.
2. **Copy** its link with the **Copy MCP link** button.
3. **Paste** the link into your AI assistant's chat, together with your question.
4. **Read** the answer.
5. **Check** it before you use it. You are always the one who decides.

---

## What is an MCP?

Your AI assistant is clever, but on its own it knows nothing about Water Care: our proposals, our campaign results, our brand or our rules.

An **MCP** (Model Context Protocol) is a **helper** that gives your assistant safe access to one specific thing, such as our past grant proposals or our fundraising totals.

Think of it like a **plug adapter**:

- Your **assistant** is the device (for example Microsoft Copilot or Claude).
- The **MCP** is the adapter that lets it reach one Water Care resource.
- The **rules** are built into the adapter. The assistant can only get what the MCP allows, whichever assistant you use.

That last point matters most. **The MCP decides what data leaves our systems, not the assistant.** That is how we keep donor data protected.

---

## Step by step: using an MCP

### 1. Choose the right MCP

Open the **Catalogue** tab. You can:

- **Search** by task, for example "grant", "flyer" or "retention".
- Open **Details** to see what the MCP can do, what it will never return, and example questions.

Only MCPs marked **Live** or **Pilot** can be used. **Proposed** MCPs are ideas still being reviewed.

### 2. Copy the MCP link

On the MCP's card or page, click **Copy MCP link**. It looks like this:

```
[HUB-URL]/mcp/fundraising-kpi
```

### 3. Paste the link and your question into the chat

Open your AI assistant and start a new chat. Paste the MCP link, then write your question in plain language, the way you would ask a colleague. For example:

> [HUB-URL]/mcp/fundraising-kpi
> How did the spring appeal do compared with last year?

> [HUB-URL]/mcp/grant-copilot
> Draft a 200-word "problem statement" for the Prairie Water Trust application, based on our past Nemba proposals.

> [HUB-URL]/mcp/flyer-studio
> Make a bilingual A5 flyer for World Water Day.

Using the MCP link every time keeps answers consistent across the team: everyone works from the same Water Care data, templates and rules.

**Tips:**

- Use **one MCP per chat**. Start a new chat for a different task.
- Say what **format** you want back: a table, a short paragraph, bullet points, English and French.
- If the answer isn't quite right, just reply with what to change ("shorter", "more formal", "add last year's figure").

### 4. Check before you use it

AI can make mistakes. Before anything leaves your desk:

- **Check facts and numbers**, especially anything for a funder, the board or the public.
- **Use the sources.** Most MCPs show where their answer came from, so open the source if anything looks off.
- **Funder reports and proposals:** note that you used AI. Some funders (including FDF) require us to disclose material AI use. The Hub logs it for you, but you are responsible for the final text.

---

## What MCPs will never share

Some information is never available to any MCP, by design:

- Major-donor and legacy relationship notes
- Bereavement and legacy conversations
- HR files and staff records
- Safeguarding reports
- Personal data about people in the communities we work with

MCPs that use supporter data only give **totals and trends**, never names, emails or addresses.

If you ask for something an MCP may not return, it will say no and suggest what it _can_ give you instead. That is the system working as intended, not an error.

---

## Rules to remember

- ✅ **Check** every output before you use it. A named person is accountable for anything we send.
- ✅ **Disclose** material AI use in funder proposals and reports.
- ❌ Do **not** paste donor, staff or partner personal information into personal AI accounts or unapproved tools.
- ❌ Do **not** use AI to make decisions about people (hiring, who gets funding, which donors to drop).
- ❌ Do **not** create images that look like real photos of communities.

---

## Requesting a new MCP

Have a task you do again and again that an MCP could help with? Open the **Request an MCP** tab.

1. **Describe the task** in plain words, for example "draft thank-you letters for corporate partners from their quarterly results".
2. **Pick your team.**
3. **Say what information it would need**, for example past proposals, campaign results or brand templates.
4. **Tick any that apply:** speaks to the public, helps decide about people, uses country programme data, or writes funder text.
5. **Submit.** The team reviews your request and lets you know the next steps.

### For the technically curious: what the MCP Builder does

The MCP Builder (run by IT or the Data & AI lead) creates a new MCP from a template that already includes:

- the **data rules** (what it may and may not return),
- **sign-in** with Water Care accounts,
- **logging** of every request, including refused ones,
- a **risk check** and a draft **go/stop rule**.

You don't need to do any of this yourself. Just describe the task clearly.

---

## The Governance tab

This tab is mainly for managers, the leadership team and the board. It shows:

- every MCP, its owner, approval, review date and **go/stop rule**,
- **hours freed** and where that time went,
- **blocked requests**, so we can see the rules working,
- an export of the **AI-use disclosure log** for funders.

---

## Frequently asked questions

**Is AI going to replace my job?**
No. Success is measured by time given back for the work that matters, such as supporter conversations, partner support and better proposals, not by cutting roles.

**Which assistant should I use?**
The AI assistant Water Care has approved for work. Ask IT & Operations if you're unsure which one that is.

**Can I use an MCP with my personal AI account?**
No. Use your work assistant, signed in with your Water Care account.

**The MCP refused my request. Is it broken?**
Probably not. It may be protecting personal data. Read its message: it usually tells you what it can provide instead (for example, a count rather than a list of names).

**The answer looks wrong. What do I do?**
Don't use it. Check the source, and report it with the **Feedback** button on the MCP's page. Errors count toward each MCP's go/stop rule.

**Does the AI learn from our data?**
Our work assistant is set up so the vendor does not train on our data. MCPs that use supporter data only send totals, never names.

**Can I use it in French?**
Yes. Ask in French, or ask for both languages. French text for supporters should still be reviewed by the Bilingual Content Coordinator.

---

## Words you might see

| Word                  | Plain meaning                                                                         |
| --------------------- | ------------------------------------------------------------------------------------- |
| **Assistant / model** | The AI chat tool you type into, for example Copilot or Claude.                        |
| **MCP**               | A ready-made helper that gives your assistant safe access to one Water Care resource. |
| **MCP link**          | The web address you paste into the chat to use an MCP.                                |
| **Prompt**            | What you type to the assistant.                                                       |
| **Aggregated**        | Totals or averages, with no individual people shown.                                  |
| **Go/stop rule**      | The agreed test that decides whether an MCP stays, grows or is switched off.          |
