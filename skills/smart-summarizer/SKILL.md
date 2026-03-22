---
name: Smart Summarizer
description: >
  Summarize any text, URL, or document text into concise, configurable output.
  Use when the user wants a quick brief, bullet summary, or executive digest of
  long content. Returns structured summary fields for research agents, email
  digests, and document triage. Deterministic and free to use.
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# Smart Summarizer

Summarize long content into a shorter, usable form without depending on an upstream LLM. This skill is built for agent workflows that need consistent structured output, not creative rewriting.

> **Free to use.** Just create a Claw0x API key and call the skill.

## What It Does

- Summarizes raw text
- Summarizes a public URL by fetching readable page content
- Summarizes document content when the document text is already extracted upstream
- Returns a short summary plus bullet points and metadata

## Why This V1 Is Narrower Than The Name

The marketplace pitch says "text, URL, or document", but a free deterministic skill should not pretend to parse every file format. In this version:

- `text` is fully supported
- `url` is fully supported for public HTML or plain text pages
- `document_text` is supported when another step already extracted the document's text

This avoids hidden upstream AI costs and keeps the skill reliable enough to list as a free utility.

## When To Use

- Research agents need a first-pass summary of an article or note
- Email digest workflows need a compact brief
- Document triage needs quick key points before deeper review
- Agents want stable JSON output instead of free-form paragraphs

## Input

Provide exactly one source field.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | no | Raw text to summarize |
| `document_text` | string | no | Extracted text from a PDF, DOCX, transcript, or other document |
| `url` | string | no | Public `http` or `https` URL to fetch and summarize |
| `title` | string | no | Optional source title |
| `style` | string | no | `brief`, `bullet`, or `executive` |
| `summary_type` | string | no | Alias for style. `action_items` and `research_digest` map to executive style |
| `max_sentences` | number | no | Number of sentences to keep, 2-10 |
| `max_length` | number | no | Soft length hint used to infer summary density |
| `language` | string | no | Caller-provided language hint, echoed back in output |

## Output Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Source title or inferred heading |
| `summary` | string | Main summary text |
| `bullets` | string[] | Bullet-form key points |
| `key_points` | string[] | Alias of bullets for agent pipelines |
| `source_type` | string | `text`, `url`, or `document` |
| `source_url` | string \| null | Original URL if URL mode was used |
| `sentence_count_used` | number | Number of summary sentences selected |
| `original_sentence_count` | number | Number of readable source sentences detected |
| `original_characters` | number | Source size in characters |
| `summarized_characters` | number | Output summary size in characters |
| `keywords` | string[] | Frequent source terms |
| `excerpt` | string | First readable source sentence |

## Example

**Input**

```json
{
  "input": {
    "text": "Smart summarization is useful when teams need a fast first-pass review of long internal documents. It helps operators triage what matters, extract the main decisions, and skip repetitive detail. It is especially useful in research workflows where many articles must be screened before deep reading.",
    "style": "bullet",
    "max_sentences": 3
  }
}
```

**Output**

```json
{
  "title": "Smart summarization is useful when teams need a fast first-pass review of long internal documents.",
  "summary": "- Smart summarization is useful when teams need a fast first-pass review of long internal documents.\n- It helps operators triage what matters, extract the main decisions, and skip repetitive detail.\n- It is especially useful in research workflows where many articles must be screened before deep reading.",
  "bullets": [
    "Smart summarization is useful when teams need a fast first-pass review of long internal documents.",
    "It helps operators triage what matters, extract the main decisions, and skip repetitive detail.",
    "It is especially useful in research workflows where many articles must be screened before deep reading."
  ],
  "source_type": "text",
  "keywords": ["documents", "research", "workflows"]
}
```

## Error Codes

- `400` Missing input, multiple source fields, invalid URL, or unreadable content
- `401` Missing or invalid Claw0x API key
- `502` URL fetch failed
- `500` Internal processing error

## Pricing

**Free.** No upstream provider key required.
